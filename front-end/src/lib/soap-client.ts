// src/lib/soap-client.ts
//
// Server-side SOAP/XML client. Builds SOAP envelopes, sends real HTTP POSTs to
// the in-process Backend SOAP endpoints (http://127.0.0.1:3001/wsdl*), parses
// the XML responses into JS values, and surfaces SOAP Faults as structured errors.
//
// This is genuine SOAP/XML communication — not a JSON mirror.

import { ensureBackend, BACKEND_URL } from "./backend-runtime";

// Each SOAP service is mounted on its own path, with its own XML namespace and
// SOAPAction base. Derived from the Backend's WSDL files (read-only analysis).
interface ServiceDef {
  path: string; // SOAP endpoint path on the backend
  namespace: string; // XML targetNamespace (tns)
}

const SERVICES: Record<string, ServiceDef> = {
  auth: { path: "/wsdl", namespace: "http://scolarite.example.com/auth" },
  accounts: {
    path: "/wsdl/accounts",
    namespace: "http://scolarite.example.com/accounts",
  },
  students: {
    path: "/wsdl/students",
    namespace: "http://scolarite.example.com/students",
  },
  subjects: {
    path: "/wsdl/subjects",
    namespace: "http://scolarite.example.com/subjects",
  },
  notes: { path: "/wsdl/notes", namespace: "http://scolarite.example.com/notes" },
  sections: {
    path: "/wsdl/sections",
    namespace: "http://scolarite.example.com/sections",
  },
};

export interface SoapCallOptions {
  /** JWT bearer token (sent as Authorization: Bearer — exactly what the Backend expects). */
  token?: string | null;
  /** Per-call timeout in ms (default 30s; the backend can be slow on first call). */
  timeoutMs?: number;
}

/** Structured SOAP fault thrown when the Backend returns a <soap:Fault>. */
export class SoapFaultError extends Error {
  code: string;
  champsManquants?: string[];
  constructor(code: string, message: string, champsManquants?: string[]) {
    super(message);
    this.name = "SoapFaultError";
    this.code = code;
    this.champsManquants = champsManquants;
  }
}

/**
 * Invoke a SOAP operation.
 *
 * @param service  Service key (auth | accounts | students | subjects | notes)
 * @param operation  WSDL operation name (e.g. "seConnecter", "listerComptes")
 * @param params  Object serialized as child elements of the operation element.
 *                Values may be strings, numbers, booleans; nested objects become
 *                nested elements; arrays become repeated elements.
 * @param opts  Token + timeout.
 * @returns Parsed body content of the <{operation}Response> element as a JS value.
 */
export async function callSoap<T = unknown>(
  service: string,
  operation: string,
  params: Record<string, unknown> = {},
  opts: SoapCallOptions = {}
): Promise<T> {
  // Make sure the in-process backend is up before talking to it.
  await ensureBackend();

  const svc = SERVICES[service];
  if (!svc) throw new Error(`Unknown SOAP service: ${service}`);

  const envelope = buildEnvelope(svc.namespace, operation, params);
  const soapAction = `"${svc.namespace}/${operation}"`;
  const url = `${BACKEND_URL}${svc.path}`;

  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    opts.timeoutMs ?? 30_000
  );

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        SOAPAction: soapAction,
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: envelope,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    throw new SoapFaultError(
      "RESEAU",
      `Impossible de joindre le service SOAP (${service}/${operation}): ${
        err instanceof Error ? err.message : String(err)
      }`
    );
  }
  clearTimeout(timer);

  const xml = await res.text();
  return parseSoapResponse<T>(xml, operation) as T;
}

/**
 * Build a SOAP 1.1 envelope (document/literal wrapped). The operation element
 * is in the service namespace (tns); child parameters use the same namespace.
 */
function buildEnvelope(
  namespace: string,
  operation: string,
  params: Record<string, unknown>
): string {
  const body = serializeParams(namespace, operation, params);
  return (
    `<?xml version="1.0" encoding="utf-8"?>` +
    `<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="${namespace}">` +
    `<soap:Body>${body}</soap:Body>` +
    `</soap:Envelope>`
  );
}

/** Recursively serialize params into XML elements in the given namespace. */
function serializeParams(
  namespace: string,
  tagName: string,
  value: unknown
): string {
  if (value === null || value === undefined) return "";
  if (Array.isArray(value)) {
    // Arrays become repeated sibling elements with the same tagName.
    return value
      .map((v) => serializeParams(namespace, tagName, v))
      .join("");
  }
  if (typeof value === "object") {
    const inner = Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => serializeParams(namespace, k, v))
      .join("");
    return `<tns:${tagName}>${inner}</tns:${tagName}>`;
  }
  // Primitive — text content, XML-escaped.
  return `<tns:${tagName}>${escapeXml(String(value))}</tns:${tagName}>`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Parse a SOAP response XML string.
 * - If a <soap:Fault> is present, throw a SoapFaultError with the detail.
 * - Otherwise, locate <{operation}Response> and convert its subtree to a JS value.
 */
export function parseSoapResponse<T>(xml: string, operation: string): T {
  // Check for fault first (cheap string sniff, then parse if present).
  if (xml.includes("<soap:Fault") || xml.includes("<Fault")) {
    throwFaultFromXml(xml);
  }

  const responseTag = `${operation}Response`;
  // The response element is emitted with a default namespace (xmlns="..."),
  // not the tns: prefix. We locate it by local name.
  const start = xml.indexOf(`<${responseTag}`);
  if (start === -1) {
    // Maybe namespaced with a prefix different from tns; fall back to local-name search.
    const re = new RegExp(`<\\w*:?${responseTag}[\\s>]`);
    const m = re.exec(xml);
    if (!m) {
      throw new SoapFaultError(
        "REPONSE_INVALIDE",
        `Réponse SOAP inattendue pour ${operation} (élément ${responseTag} absent)`
      );
    }
  }

  // Extract the inner content of <{operation}Response>...</{operation}Response}>
  // (handling the default-namespace form). We find the matching close tag by
  // local name to be robust against any prefix.
  const inner = extractElementInner(xml, responseTag);
  if (inner === null) {
    throw new SoapFaultError(
      "REPONSE_INVALIDE",
      `Impossible de lire la réponse SOAP pour ${operation}`
    );
  }
  return xmlToObject(inner) as T;
}

/** Locate <{localName} ...>...</{localName}> (any prefix) and return its inner XML. */
function extractElementInner(xml: string, localName: string): string | null {
  const openRe = new RegExp(`<([^:>\\s]*:)?${localName}(\\s[^>]*)?>`, "i");
  const openMatch = openRe.exec(xml);
  if (!openMatch) return null;
  const prefix = openMatch[1] || "";
  const openEnd = openMatch.index! + openMatch[0].length;
  // Match the corresponding close tag with the same prefix.
  const closeRe = new RegExp(`</${prefix}${localName}>`, "i");
  // Search forward from openEnd.
  const closeMatch = closeRe.exec(xml.slice(openEnd));
  if (!closeMatch) return null;
  return xml.slice(openEnd, openEnd + closeMatch.index);
}

/**
 * Convert an XML fragment (the inner content of a response element) into a JS value.
 *
 * Rules (matching the Backend's WSDL element shapes):
 *   - A single child element with text → its text value (auto-cast number/bool).
 *   - A single child element with nested children → an object.
 *   - Multiple sibling elements with the SAME local name → an array.
 *   - Empty element → "" (the Backend emits empty strings for null optional fields).
 *   - A wrapper element (e.g. <comptes><compte/>...</comptes>) is unwrapped:
 *     if a parent has exactly one child which itself contains repeated children,
 *     the array is the repeated children list.
 */
export function xmlToObject(fragment: string): unknown {
  const root = parseFragment(fragment);
  // The synthetic root holds the top-level elements of the fragment as children.
  // Always group them by local name so wrapper keys are preserved
  // (e.g. <comptes><compte/><compte/></comptes> → { comptes: [...] },
  //  <compte>…</compte> → { compte: {...} }, <jeton/><utilisateur/> → { jeton, utilisateur }).
  if (root.children.length === 0) {
    return castValue(root.text);
  }
  return childrenToObject(root.children);
}

interface ElNode {
  localName: string;
  children: ElNode[];
  text: string;
}

/**
 * Parse a fragment (which may contain several sibling top-level elements) into a
 * synthetic root node whose `.children` are those top-level elements.
 */
function parseFragment(fragment: string): ElNode {
  const stack: ElNode[] = [];
  const synthetic: ElNode = { localName: "_root", children: [], text: "" };
  let i = 0;
  const s = fragment.trim();
  while (i < s.length) {
    if (s[i] !== "<") {
      // text until next '<'
      let j = s.indexOf("<", i);
      if (j === -1) j = s.length;
      const text = s.slice(i, j);
      if (stack.length) {
        stack[stack.length - 1].text += decodeEntities(text);
      }
      i = j;
      continue;
    }
    // it's a tag
    if (s[i + 1] === "/") {
      // close tag </prefix:localName>
      const closeEnd = s.indexOf(">", i);
      const tagName = s.slice(i + 2, closeEnd);
      const localName = stripPrefix(tagName);
      // pop until matching
      for (let k = stack.length - 1; k >= 0; k--) {
        if (stack[k].localName === localName) {
          stack.length = k;
          break;
        }
      }
      i = closeEnd + 1;
      continue;
    }
    // open/self-close tag
    const gt = s.indexOf(">", i);
    if (gt === -1) break;
    const tagContent = s.slice(i + 1, gt);
    const selfClose = tagContent.endsWith("/");
    const tagInner = selfClose ? tagContent.slice(0, -1) : tagContent;
    // tag name is up to first space
    const spaceIdx = tagInner.indexOf(" ");
    const tagName =
      spaceIdx === -1 ? tagInner : tagInner.slice(0, spaceIdx);
    const localName = stripPrefix(tagName);
    const node: ElNode = { localName, children: [], text: "" };
    if (stack.length) stack[stack.length - 1].children.push(node);
    else synthetic.children.push(node);
    if (!selfClose) stack.push(node);
    i = gt + 1;
  }
  return synthetic;
}

function stripPrefix(tag: string): string {
  const colon = tag.indexOf(":");
  return colon === -1 ? tag : tag.slice(colon + 1);
}

function nodeValue(node: ElNode): unknown {
  // If the element has child elements, build an object/array from them.
  if (node.children.length > 0) {
    return childrenToObject(node.children);
  }
  // Leaf element — return its (possibly empty) text, auto-cast.
  return castValue(node.text);
}

function childrenToObject(children: ElNode[]): unknown {
  // Repeated same-name children → array of their values (the SOAP list pattern:
  // a wrapper element like <comptes> contains many <compte/> children).
  if (children.length > 1 && allSameName(children)) {
    return children.map(nodeValue);
  }

  // Otherwise group children by local name; repeated names become arrays.
  const out: Record<string, unknown> = {};
  const counts: Record<string, number> = {};
  for (const c of children) {
    counts[c.localName] = (counts[c.localName] || 0) + 1;
  }
  for (const c of children) {
    const v = nodeValue(c);
    if (counts[c.localName] > 1) {
      if (!out[c.localName]) out[c.localName] = [];
      (out[c.localName] as unknown[]).push(v);
    } else {
      out[c.localName] = v;
    }
  }
  return out;
}

function allSameName(nodes: ElNode[]): boolean {
  if (nodes.length === 0) return false;
  const first = nodes[0].localName;
  return nodes.every((n) => n.localName === first);
}

function castValue(text: string): string | number | boolean {
  const t = text.trim();
  if (t === "") return "";
  if (/^-?\d+(\.\d+)?$/.test(t)) {
    const n = Number(t);
    if (!Number.isNaN(n)) return n;
  }
  if (t === "true") return true;
  if (t === "false") return false;
  return t;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#xA;/g, "\n")
    .replace(/&#x9;/g, "\t")
    .replace(/&amp;/g, "&");
}

/** Parse a <soap:Fault> and throw a structured SoapFaultError. */
function throwFaultFromXml(xml: string): never {
  let code = "ERREUR";
  let message = "Erreur SOAP";
  const champsManquants: string[] = [];

  // SOAP 1.2 style (Backend uses this): Code/Subcode/Value, Reason/Text, Detail/{code,message}
  const reasonMatch = /<soap:Reason>\s*<soap:Text>([^<]*)<\/soap:Text>/i.exec(
    xml
  );
  if (reasonMatch) message = decodeEntities(reasonMatch[1]);

  const subcodeMatch = /<soap:Subcode>\s*<soap:Value>([^<]*)<\/soap:Value>/i.exec(
    xml
  );
  if (subcodeMatch) code = decodeEntities(subcodeMatch[1]);

  // Detail block (the Backend puts code/message/champsManquants there, namespaced)
  const detailInner = extractElementInner(xml, "Detail") || extractElementInner(xml, "detail");
  if (detailInner) {
    const dCode = /<(?:soap:)?code>([^<]*)<\/(?:soap:)?code>/i.exec(detailInner);
    if (dCode) code = decodeEntities(dCode[1]);
    const dMsg = /<(?:soap:)?message>([^<]*)<\/(?:soap:)?message>/i.exec(detailInner);
    if (dMsg) message = decodeEntities(dMsg[1]);
    // champsManquants may be a single element or repeated
    const cmRe = /<(?:soap:)?champsManquants>([^<]*)<\/(?:soap:)?champsManquants>/gi;
    let m: RegExpExecArray | null;
    while ((m = cmRe.exec(detailInner)) !== null) {
      champsManquants.push(decodeEntities(m[1]));
    }
  }

  throw new SoapFaultError(code, message, champsManquants.length ? champsManquants : undefined);
}

// src/lib/backend-runtime.ts
//
// Hosts the existing Backend's SOAP/REST Express server IN-PROCESS within the
// Next.js dev server. The sandbox kills any detached child process when a shell
// command returns, while the Next.js dev server (started by the sandbox)
// persists. By requiring the Backend's own server.js (read-only, untouched)
// from within the Next.js Node.js runtime, the Backend's Express + SOAP services
// live as long as Next.js does.
//
// IMPORTANT: The Backend files are NOT modified — they are only loaded.
// The Backend runs on port 3001 (PORT env), Next.js on 3000. No conflict.
//
// Real SOAP/XML happens on the wire: the Next.js API routes (soap-client.ts)
// perform actual HTTP POSTs with XML SOAP envelopes to http://127.0.0.1:3001/wsdl*
// and parse the XML responses.

import path from "node:path";
import { createRequire } from "node:module";

// Stash the native CJS require on globalThis under an opaque key. This defeats
// Turbopack's static analysis: the bundler cannot tell that __loadBackend is a
// require, so it does not try to bundle its (absolute, runtime-computed) path
// argument. `createRequire` is the correct ESM way to obtain a CJS require.
(globalThis as unknown as { __loadBackend?: NodeRequire }).__loadBackend ??= createRequire(import.meta.url);

const BACKEND_DIR = path.resolve(
  process.cwd(),
  "upload/extracted/projet_gestion_notes-main/back-end"
);
const BACKEND_URL = "http://127.0.0.1:3001";

let bootPromise: Promise<void> | null = null;
let booted = false;

/** Idempotently start the in-process Backend (Express + SOAP on :3001). */
export function ensureBackend(): Promise<void> {
  if (booted) return Promise.resolve();
  if (bootPromise) return bootPromise;
  bootPromise = startBackendOnce();
  return bootPromise;
}

async function startBackendOnce(): Promise<void> {
  // 1. If the backend is already listening (e.g. a previous module evaluation in
  //    the same Next.js process loaded it, and HMR re-evaluated this module),
  //    skip re-loading server.js to avoid EADDRINUSE.
  if (await isReachable(BACKEND_URL)) {
    booted = true;
    return;
  }

  try {
    // Configure env BEFORE loading the backend so it picks the right port.
    process.env.PORT = "3001";
    process.env.CORS_ORIGIN = "*";
    process.env.DB_DIALECT = process.env.DB_DIALECT || "sqlite";

    // Resolve the backend entry at runtime. The path is built from process.cwd()
    // so it cannot be statically analyzed by the bundler.
    const dir =
      process.env.BACKEND_DIR ||
      path.resolve(
        process.cwd(),
        "upload/extracted/projet_gestion_notes-main/back-end"
      );
    const entry = path.join(dir, "server.js");

    // Load the backend server.js (untouched). This runs its top-level code:
    // Express setup + soap.listen for all 5 services + the async startup that
    // syncs the DB schema and starts app.listen(3001).
    const loader = (globalThis as unknown as { __loadBackend: NodeRequire }).__loadBackend;
    loader(entry);

    // Poll until the SOAP server actually responds (startup is slow: Sequelize +
    // sqlite3 + soap library load + schema sync — can take ~60s cold).
    await waitForReady(BACKEND_URL, 180_000);
    booted = true;
  } catch (err) {
    bootPromise = null; // allow a retry on next call
    throw err;
  }
}

function isReachable(url: string): Promise<boolean> {
  return fetch(url, { method: "GET" })
    .then(() => true)
    .catch(() => false);
}

function waitForReady(url: string, timeoutMs: number): Promise<void> {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (Date.now() - start > timeoutMs) {
        return reject(new Error("Backend did not become ready in time"));
      }
      isReachable(url).then((ok) => (ok ? resolve() : setTimeout(tick, 1000)));
    };
    setTimeout(tick, 500);
  });
}

export { BACKEND_URL };

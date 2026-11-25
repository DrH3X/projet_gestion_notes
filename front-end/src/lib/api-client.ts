// src/lib/api-client.ts
//
// Frontend-facing HTTP client. Talks ONLY to the Next.js API route
// /api/soap/<service>/<operation> using relative URLs + JSON. The actual
// SOAP/XML exchange with the Backend happens server-side, in the route handler.

import type { SoapFault } from "@/types";

const TOKEN_KEY = "scolarite.jwt";
const USER_KEY = "scolarite.user";

/** Read the persisted JWT from localStorage (client-side only). */
export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) window.localStorage.setItem(TOKEN_KEY, token);
  else window.localStorage.removeItem(TOKEN_KEY);
}

export function getPersistedUser<T = unknown>(): T | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function setPersistedUser(user: unknown | null) {
  if (typeof window === "undefined") return;
  if (user) window.localStorage.setItem(USER_KEY, JSON.stringify(user));
  else window.localStorage.removeItem(USER_KEY);
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  code?: string;
  message?: string;
  champsManquants?: string[];
}

/** Low-level call: POST JSON to /api/soap/<service>/<operation>. */
export async function apiCall<T = unknown>(
  service: string,
  operation: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = getToken();
  const res = await fetch(`/api/soap/${service}/${operation}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  let payload: ApiResult<T>;
  try {
    payload = (await res.json()) as ApiResult<T>;
  } catch {
    throw {
      code: "RESEAU",
      message: "Réponse non-JSON du serveur",
    } as SoapFault;
  }

  if (!payload.ok) {
    throw {
      code: payload.code || "ERREUR",
      message: payload.message || "Erreur inconnue",
      champsManquants: payload.champsManquants,
    } as SoapFault;
  }

  return payload.data as T;
}

// Convenience namespaces mirroring the SOAP services.
export const api = {
  auth: {
    login: (email: string, motDePasse: string) =>
      apiCall("auth", "login", { email, motDePasse }),
    logout: (jeton: string) => apiCall("auth", "logout", { jeton }),
  },
  accounts: {
    list: (role = "") => apiCall("accounts", "list", { role }),
    create: (body: Record<string, unknown>) => apiCall("accounts", "create", body),
    update: (body: Record<string, unknown>) => apiCall("accounts", "update", body),
    remove: (id: string) => apiCall("accounts", "delete", { id }),
  },
  students: {
    list: (classe = "") => apiCall("students", "list", { classe }),
    teacherList: (classe = "") => apiCall("students", "teacherList", { classe }),
    me: () => apiCall("students", "me", {}),
    get: (id: string) => apiCall("students", "get", { id }),
    create: (body: Record<string, unknown>) => apiCall("students", "create", body),
    update: (body: Record<string, unknown>) => apiCall("students", "update", body),
    remove: (id: string) => apiCall("students", "delete", { id }),
  },
  subjects: {
    list: () => apiCall("subjects", "list", {}),
    myList: () => apiCall("subjects", "myList", {}),
    create: (body: Record<string, unknown>) => apiCall("subjects", "create", body),
    update: (body: Record<string, unknown>) => apiCall("subjects", "update", body),
    remove: (id: string) => apiCall("subjects", "delete", { id }),
  },
  notes: {
    teacherList: (matiereId?: string, etudiantId?: string) =>
      apiCall("notes", "teacherList", { matiereId, etudiantId }),
    averages: (classe = "") => apiCall("notes", "averages", { classe }),
    myList: () => apiCall("notes", "myList", {}),
    myBilan: () => apiCall("notes", "myBilan", {}),
    create: (body: Record<string, unknown>) => apiCall("notes", "create", body),
    update: (body: Record<string, unknown>) => apiCall("notes", "update", body),
    remove: (id: string) => apiCall("notes", "delete", { id }),
  },
  sections: {
    list: () => apiCall("sections", "list", {}),
    create: (body: Record<string, unknown>) => apiCall("sections", "create", body),
    update: (body: Record<string, unknown>) => apiCall("sections", "update", body),
    remove: (id: string) => apiCall("sections", "delete", { id }),
    listClasses: (sectionId = "") => apiCall("sections", "listClasses", { sectionId }),
    createClasse: (body: Record<string, unknown>) => apiCall("sections", "createClasse", body),
    updateClasse: (body: Record<string, unknown>) => apiCall("sections", "updateClasse", body),
    removeClasse: (id: string) => apiCall("sections", "deleteClasse", { id }),
    assignTeacherSections: (userId: string, sectionIds: string[]) =>
      apiCall("sections", "assignTeacherSections", { userId, sectionIds }),
    assignTeacherClasses: (userId: string, classeIds: string[]) =>
      apiCall("sections", "assignTeacherClasses", { userId, classeIds }),
    teacherAssignments: (userId: string) =>
      apiCall("sections", "teacherAssignments", { userId }),
    assignStudent: (etudiantId: string, sectionId: string, classeId: string) =>
      apiCall("sections", "assignStudent", { etudiantId, sectionId, classeId }),
  },
};

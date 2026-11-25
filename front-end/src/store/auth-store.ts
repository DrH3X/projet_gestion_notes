// src/store/auth-store.ts
//
// Client-side auth store (zustand). Holds the authenticated user + JWT, and the
// current SPA navigation view (since the app is a single-route SPA at `/`).

"use client";

import { create } from "zustand";
import { api } from "@/lib/api-client";
import {
  getPersistedUser,
  getToken,
  setPersistedUser,
  setToken,
} from "@/lib/api-client";
import type { Role, Utilisateur } from "@/types";

/** A flat set of section keys the UI can navigate to. */
export type ViewKey =
  | "admin.dashboard"
  | "admin.accounts"
  | "admin.subjects"
  | "admin.grades"
  | "admin.results"
  | "admin.sections"
  | "teacher.dashboard"
  | "teacher.subjects"
  | "teacher.students"
  | "teacher.grades"
  | "teacher.results"
  | "student.dashboard"
  | "student.grades"
  | "student.report"
  | "student.profile";

interface AuthState {
  user: Utilisateur | null;
  token: string | null;
  status: "loading" | "authenticated" | "unauthenticated";
  view: ViewKey;
  sidebarCollapsed: boolean;
  // hydrate from localStorage on mount
  hydrate: () => void;
  login: (email: string, motDePasse: string) => Promise<Utilisateur>;
  logout: () => Promise<void>;
  setView: (v: ViewKey) => void;
  toggleSidebar: () => void;
  defaultViewFor: (role: Role) => ViewKey;
}

// Zustand + HMR singleton: preserve a single store instance across Fast Refresh
// re-evaluations. Without this, HMR re-runs `create(...)` and produces a second
// store — the Sidebar (imported before the reload) would keep writing to the OLD
// store while the ViewRouter (re-imported) reads the NEW one, breaking nav.
// By stashing the store on `window` and re-using it, all importers share one.
function createAuthStore() {
  return create<AuthState>((set, get) => ({
    user: null,
    token: null,
    status: "loading",
    view: "admin.dashboard",
    sidebarCollapsed: false,

    hydrate: () => {
      const token = getToken();
      const user = getPersistedUser<Utilisateur>();
      if (token && user) {
        set({
          token,
          user,
          status: "authenticated",
          view: get().defaultViewFor(user.role),
        });
      } else {
        set({ token: null, user: null, status: "unauthenticated", view: "admin.dashboard" });
      }
    },

    login: async (email, motDePasse) => {
      const res = (await api.auth.login(email, motDePasse)) as {
        jeton: string;
        utilisateur: Utilisateur;
      };
      setToken(res.jeton);
      setPersistedUser(res.utilisateur);
      set({
        token: res.jeton,
        user: res.utilisateur,
        status: "authenticated",
        view: get().defaultViewFor(res.utilisateur.role),
      });
      return res.utilisateur;
    },

    logout: async () => {
      const token = get().token;
      if (token) {
        try {
          await api.auth.logout(token);
        } catch {
          /* ignore network/fault errors on logout */
        }
      }
      setToken(null);
      setPersistedUser(null);
      set({ token: null, user: null, status: "unauthenticated", view: "admin.dashboard" });
    },

    setView: (v) => set({ view: v }),
    toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

    defaultViewFor: (role) =>
      role === "administrateur"
        ? "admin.dashboard"
        : role === "enseignant"
        ? "teacher.dashboard"
        : "student.dashboard",
  }));
}

export const useAuth =
  typeof window !== "undefined"
    ? ((window as unknown as { __useAuth?: typeof useAuth }).__useAuth ??=
        createAuthStore())
    : createAuthStore();

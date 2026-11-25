"use client";

import { useState } from "react";
import { LogOut, ChevronRight, UserCircle, Settings } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth, type ViewKey } from "@/store/auth-store";
import { ROLE_LABELS } from "./sidebar";
import { cn } from "@/lib/utils";

const VIEW_LABELS: Record<ViewKey, string> = {
  "admin.dashboard": "Tableau de bord",
  "admin.accounts": "Comptes",
  "admin.subjects": "Matières",
  "admin.grades": "Notes",
  "admin.results": "Moyennes",
  "admin.sections": "Sections & Classes",
  "teacher.dashboard": "Tableau de bord",
  "teacher.subjects": "Mes matières",
  "teacher.students": "Mes étudiants",
  "teacher.grades": "Saisie des notes",
  "teacher.results": "Moyennes & Résultats",
  "student.dashboard": "Accueil",
  "student.grades": "Mes notes",
  "student.report": "Bilan académique",
  "student.profile": "Mon profil",
};

export function Header() {
  const { user, view, logout } = useAuth();
  const [search, setSearch] = useState("");

  if (!user) return null;

  const initials = `${user.prenom?.[0] ?? ""}${user.nom?.[0] ?? ""}`.toUpperCase();
  const sectionLabel = VIEW_LABELS[view] ?? "";

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="h-16 shrink-0 border-b border-border bg-card/60 backdrop-blur supports-[backdrop-filter]:bg-card/50 sticky top-0 z-30">
      <div className="h-full flex items-center gap-4 px-4 sm:px-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm min-w-0">
          <span className="text-muted-foreground hidden sm:inline">
            {ROLE_LABELS[user.role] ?? user.role}
          </span>
          <ChevronRight className="h-4 w-4 text-muted-foreground/50 hidden sm:inline" />
          <span className="font-medium truncate">{sectionLabel}</span>
        </div>

        {/* Search (decorative — context-aware filtering lives in each section) */}
        <div className="ml-auto hidden md:flex items-center w-64 lg:w-80">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher…"
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>

        {/* Notifications placeholder */}
        <button
          className="hidden sm:flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <span className="relative">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
            <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-primary" />
          </span>
        </button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-md p-1 pr-2 hover:bg-muted transition-colors">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                  {initials || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden sm:block text-left">
                <p className="text-sm font-medium leading-tight">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-[11px] text-muted-foreground leading-tight">
                  {ROLE_LABELS[user.role] ?? user.role}
                </p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">
                  {user.prenom} {user.nom}
                </p>
                <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem disabled className="text-muted-foreground">
              <UserCircle className="mr-2 h-4 w-4" />
              Mon profil
            </DropdownMenuItem>
            <DropdownMenuItem disabled className="text-muted-foreground">
              <Settings className="mr-2 h-4 w-4" />
              Préférences
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

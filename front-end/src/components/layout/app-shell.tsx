"use client";

import { useState } from "react";
import {
  Layers,
  GraduationCap,
  LayoutDashboard,
  Users,
  UserCog,
  BookOpen,
  ClipboardList,
  PenSquare,
  BarChart3,
  FileText,
  UserCircle,
  Menu,
} from "lucide-react";
import { useAuth, type ViewKey } from "@/store/auth-store";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const NAVS: Record<string, NavItem[]> = {
  administrateur: [
    { key: "admin.dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "admin.accounts", label: "Comptes", icon: UserCog },
    { key: "admin.subjects", label: "Matières", icon: BookOpen },
    { key: "admin.grades", label: "Notes", icon: ClipboardList },
    { key: "admin.results", label: "Moyennes", icon: BarChart3 },
    { key: "admin.sections", label: "Sections & Classes", icon: Layers },
  ],
  enseignant: [
    { key: "teacher.dashboard", label: "Tableau de bord", icon: LayoutDashboard },
    { key: "teacher.subjects", label: "Mes matières", icon: BookOpen },
    { key: "teacher.students", label: "Mes étudiants", icon: Users },
    { key: "teacher.grades", label: "Saisie des notes", icon: PenSquare },
    { key: "teacher.results", label: "Moyennes & Résultats", icon: BarChart3 },
  ],
  etudiant: [
    { key: "student.dashboard", label: "Accueil", icon: LayoutDashboard },
    { key: "student.grades", label: "Mes notes", icon: ClipboardList },
    { key: "student.report", label: "Bilan académique", icon: FileText },
    { key: "student.profile", label: "Mon profil", icon: UserCircle },
  ],
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, view, setView } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  if (!user) return null;

  const items = NAVS[user.role] ?? [];

  return (
    <div className="min-h-screen flex bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar with menu trigger */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-border bg-card">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar text-sidebar-foreground border-sidebar-border">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border">
                <div className="h-9 w-9 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">Scolarité</p>
                  <p className="text-[11px] text-white/50">Gestion académique</p>
                </div>
              </div>
              <nav className="p-2 space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const active = view === item.key;
                  return (
                    <button
                      key={item.key}
                      onClick={() => {
                        setView(item.key);
                        setMobileOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                        active
                          ? "bg-sidebar-accent text-white font-medium"
                          : "text-white/65 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-4 w-4 text-primary" />
            </div>
            <span className="font-semibold text-sm">Scolarité</span>
          </div>
        </div>

        <Header />

        <main className="flex-1 overflow-y-auto scroll-slim">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">{children}</div>
        </main>

        <footer className="mt-auto border-t border-border bg-card/50">
          <div className="px-4 sm:px-6 lg:px-8 py-4 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
            <p>Scolarité — Plateforme de gestion académique</p>
          </div>
        </footer>
      </div>
    </div>
  );
}

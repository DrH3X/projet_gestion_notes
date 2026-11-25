"use client";

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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import { useAuth, type ViewKey } from "@/store/auth-store";
import { cn } from "@/lib/utils";

interface NavItem {
  key: ViewKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const ADMIN_NAV: NavItem[] = [
  { key: "admin.dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "admin.accounts", label: "Comptes", icon: UserCog },
  { key: "admin.subjects", label: "Matières", icon: BookOpen },
  { key: "admin.grades", label: "Notes", icon: ClipboardList },
  { key: "admin.results", label: "Moyennes", icon: BarChart3 },
  { key: "admin.sections", label: "Sections & Classes", icon: Layers },
];

const TEACHER_NAV: NavItem[] = [
  { key: "teacher.dashboard", label: "Tableau de bord", icon: LayoutDashboard },
  { key: "teacher.subjects", label: "Mes matières", icon: BookOpen },
  { key: "teacher.students", label: "Mes étudiants", icon: Users },
  { key: "teacher.grades", label: "Saisie des notes", icon: PenSquare },
  { key: "teacher.results", label: "Moyennes & Résultats", icon: BarChart3 },
];

const STUDENT_NAV: NavItem[] = [
  { key: "student.dashboard", label: "Accueil", icon: LayoutDashboard },
  { key: "student.grades", label: "Mes notes", icon: ClipboardList },
  { key: "student.report", label: "Bilan académique", icon: FileText },
  { key: "student.profile", label: "Mon profil", icon: UserCircle },
];

function navForRole(role: string): NavItem[] {
  if (role === "administrateur") return ADMIN_NAV;
  if (role === "enseignant") return TEACHER_NAV;
  return STUDENT_NAV;
}

const ROLE_LABELS: Record<string, string> = {
  administrateur: "Administrateur",
  enseignant: "Enseignant",
  etudiant: "Étudiant",
};

export function Sidebar() {
  const { user, view, setView, sidebarCollapsed, toggleSidebar } = useAuth();
  if (!user) return null;

  const items = navForRole(user.role);
  const grouped = groupBySection(items, user.role);

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-[width] duration-200",
        sidebarCollapsed ? "w-[68px]" : "w-[248px]"
      )}
    >
      {/* Brand */}
      <div className="h-16 flex items-center gap-3 px-4 border-b border-sidebar-border shrink-0">
        <div className="h-9 w-9 rounded-lg bg-white/10 ring-1 ring-white/15 flex items-center justify-center shrink-0">
          <GraduationCap className="h-5 w-5 text-white" />
        </div>
        {!sidebarCollapsed && (
          <div className="min-w-0">
            <p className="text-sm font-semibold tracking-tight text-white truncate">
              Scolarité
            </p>
            <p className="text-[11px] text-white/50 truncate">Gestion académique</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto scroll-slim py-4 px-2 space-y-6">
        {grouped.map((section) => (
          <div key={section.title} className="space-y-1">
            {!sidebarCollapsed && section.title && (
              <p className="px-3 mb-1 text-[10px] font-medium uppercase tracking-wider text-white/35">
                {section.title}
              </p>
            )}
            {section.items.map((item) => {
              const Icon = item.icon;
              const active = view === item.key;
              return (
                <button
                  key={item.key}
                  onClick={() => setView(item.key)}
                  title={sidebarCollapsed ? item.label : undefined}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-sidebar-accent text-white font-medium"
                      : "text-white/65 hover:text-white hover:bg-white/5",
                    sidebarCollapsed && "justify-center"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {active && !sidebarCollapsed && (
                    <span className="ml-auto h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="border-t border-sidebar-border p-2 shrink-0">
        <button
          onClick={toggleSidebar}
          className="w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm text-white/60 hover:text-white hover:bg-white/5 transition-colors"
          title={sidebarCollapsed ? "Déplier" : "Replier"}
        >
          {sidebarCollapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
          {!sidebarCollapsed && <span>Replier</span>}
        </button>
      </div>
    </aside>
  );
}

interface Section {
  title: string;
  items: NavItem[];
}

function groupBySection(items: NavItem[], role: string): Section[] {
  if (role === "administrateur") {
    return [
      { title: "Pilotage", items: items.slice(0, 1) },
      { title: "Gestion", items: items.slice(1) },
    ];
  }
  if (role === "enseignant") {
    return [
      { title: "Pilotage", items: items.slice(0, 1) },
      { title: "Enseignement", items: items.slice(1, 4) },
      { title: "Résultats", items: items.slice(4) },
    ];
  }
  return [{ title: "Mon espace", items }];
}

export { ROLE_LABELS };

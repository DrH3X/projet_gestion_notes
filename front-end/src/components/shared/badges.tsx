"use client";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Mention, Role, Statut, TypeNote } from "@/types";

export function RoleBadge({ role }: { role: Role }) {
  const map: Record<Role, { label: string; className: string }> = {
    administrateur: {
      label: "Administrateur",
      className: "bg-primary/10 text-primary border-primary/20",
    },
    enseignant: {
      label: "Enseignant",
      className: "bg-sky-500/10 text-sky-600 border-sky-500/20",
    },
    etudiant: {
      label: "Étudiant",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
  };
  const m = map[role];
  return <Badge variant="outline" className={cn("font-medium", m.className)}>{m.label}</Badge>;
}

export function StatutBadge({ statut }: { statut: Statut }) {
  if (statut === "admis") {
    return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium">Admis</Badge>;
  }
  return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium">Ajourné</Badge>;
}

export function MentionBadge({ mention }: { mention: Mention }) {
  const map: Record<Mention, { label: string; className: string }> = {
    ajourne: { label: "Ajourné", className: "bg-rose-500/10 text-rose-600 border-rose-500/20" },
    passable: { label: "Passable", className: "bg-amber-500/10 text-amber-600 border-amber-500/20" },
    assez_bien: { label: "Assez bien", className: "bg-sky-500/10 text-sky-600 border-sky-500/20" },
    bien: { label: "Bien", className: "bg-primary/10 text-primary border-primary/20" },
    tres_bien: { label: "Très bien", className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" },
  };
  const m = map[mention];
  return <Badge variant="outline" className={cn("font-medium", m.className)}>{m.label}</Badge>;
}

export function TypeNoteBadge({ type }: { type: TypeNote }) {
  const map: Record<TypeNote, string> = {
    DS: "DS",
    examen: "Examen",
    TP: "TP",
  };
  return <Badge variant="secondary" className="font-mono text-xs">{map[type]}</Badge>;
}

export function NoteValue({ value }: { value: number }) {
  const cls =
    value >= 16
      ? "text-emerald-600 font-semibold"
      : value >= 10
      ? "text-foreground font-medium"
      : "text-rose-600 font-medium";
  return <span className={cls}>{value.toFixed(2).replace(/\.?0+$/, "")}</span>;
}

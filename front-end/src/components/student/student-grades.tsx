"use client";

import { useMemo } from "react";
import { GraduationCap, Award, BookOpen } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { MentionBadge, NoteValue, StatutBadge } from "@/components/shared/badges";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import type { Bilan, Mention, Note } from "@/types";

/** Compute mention from a numerical moyenne (mirrors backend rule). */
function computeMention(moyenne: number): Mention {
  if (moyenne < 10) return "ajourne";
  if (moyenne < 12) return "passable";
  if (moyenne < 14) return "assez_bien";
  if (moyenne < 16) return "bien";
  return "tres_bien";
}

interface MatiereRow {
  matiereId: string;
  matiereIntitule: string;
  coefficient: number;
  notes: Note[];
  moyenne: number;
  ds: Note | undefined;
  examen: Note | undefined;
  tp: Note | undefined;
}

function groupNotesByMatiere(notes: Note[]): MatiereRow[] {
  const byMatiere = new Map<string, Note[]>();
  for (const n of notes) {
    const arr = byMatiere.get(n.matiereId) ?? [];
    arr.push(n);
    byMatiere.set(n.matiereId, arr);
  }
  const rows: MatiereRow[] = [];
  for (const [matiereId, ns] of byMatiere) {
    const somme = ns.reduce((s, n) => s + n.valeur, 0);
    rows.push({
      matiereId,
      matiereIntitule: ns[0]?.matiereIntitule ?? "—",
      coefficient: ns[0]?.coefficient ?? 1,
      notes: ns,
      moyenne: somme / ns.length,
      ds: ns.find((n) => n.type === "DS"),
      examen: ns.find((n) => n.type === "examen"),
      tp: ns.find((n) => n.type === "TP"),
    });
  }
  return rows.sort((a, b) => a.matiereIntitule.localeCompare(b.matiereIntitule));
}

function fmt(v: number | undefined): string {
  if (v === undefined) return "—";
  return v.toFixed(2);
}

export function StudentGrades() {
  const notes = useAsync<Note[]>(() => api.notes.myList(), []);
  const bilan = useAsync<Bilan>(() => api.notes.myBilan(), []);

  const loading = notes.loading || bilan.loading;
  const firstError = notes.error || bilan.error;

  const rows = useMemo(
    () => groupNotesByMatiere(notes.data ?? []),
    [notes.data]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Mes notes"
          description="L'ensemble de vos notes par matière."
        />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  if (firstError) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Mes notes"
          description="L'ensemble de vos notes par matière."
        />
        <ErrorState
          error={firstError}
          onRetry={() => {
            notes.refetch();
            bilan.refetch();
          }}
        />
      </div>
    );
  }

  const hasNotes = (notes.data?.length ?? 0) > 0;
  const b = bilan.data;
  const moyenne = b?.moyenne ?? null;
  const mention = b?.mention ?? (moyenne !== null ? computeMention(moyenne) : null);
  const statut = b?.statut ?? (moyenne !== null ? (moyenne >= 10 ? "admis" : "ajourne") : null);
  const nbMatieres = b?.nbMatieres ?? rows.length;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mes notes"
        description="L'ensemble de vos notes par matière."
      />

      {/* Stat summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Moyenne générale"
          value={moyenne !== null ? moyenne.toFixed(2) : "—"}
          hint={moyenne !== null ? "/ 20" : "Aucune note"}
          icon={GraduationCap}
          accent={
            moyenne === null
              ? "default"
              : moyenne >= 10
              ? "success"
              : "danger"
          }
        />
        <StatCard
          label="Mention"
          value={mention ? mentionLabel(mention) : "—"}
          icon={Award}
          accent="info"
        />
        <StatCard
          label="Statut"
          value={statut === "admis" ? "Admis" : statut === "ajourne" ? "Ajourné" : "—"}
          icon={BookOpen}
          accent={statut === "admis" ? "success" : statut === "ajourne" ? "danger" : "default"}
        />
        <StatCard
          label="Nombre de matières"
          value={nbMatieres}
          hint="Matières évaluées"
          icon={BookOpen}
          accent="default"
        />
      </div>

      {/* Grades table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium">Notes détaillées par matière</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            DS, examen et TP par matière, avec la moyenne matière calculée.
          </p>
        </div>
        {!hasNotes ? (
          <CardContent className="py-2">
            <EmptyState
              title="Aucune note disponible"
              description="Vos notes apparaîtront ici dès qu'un enseignant les aura saisies."
              className="border-0 bg-transparent"
            />
          </CardContent>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px]">Matière</TableHead>
                  <TableHead className="text-center">Coefficient</TableHead>
                  <TableHead className="text-center">DS</TableHead>
                  <TableHead className="text-center">Examen</TableHead>
                  <TableHead className="text-center">TP</TableHead>
                  <TableHead className="text-center">Moyenne matière</TableHead>
                  <TableHead className="text-center">Mention</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.matiereId}>
                    <TableCell className="font-medium">
                      {r.matiereIntitule}
                    </TableCell>
                    <TableCell className="text-center font-mono text-xs text-muted-foreground">
                      {r.coefficient}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.ds ? <NoteValue value={r.ds.valeur} /> : <Dash />}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.examen ? <NoteValue value={r.examen.valeur} /> : <Dash />}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.tp ? <NoteValue value={r.tp.valeur} /> : <Dash />}
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center rounded-md bg-muted px-2 py-1 text-sm font-semibold tabular-nums">
                        {fmt(r.moyenne)}
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <MentionBadge mention={computeMention(r.moyenne)} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      {/* Footer summary card */}
      {hasNotes && (
        <Card>
          <CardContent className="px-5 py-4">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-6">
                <div>
                  <div className="text-xs text-muted-foreground">Moyenne générale</div>
                  <div className="text-2xl font-semibold tabular-nums">
                    {moyenne !== null ? moyenne.toFixed(2) : "—"}
                    {moyenne !== null && (
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / 20
                      </span>
                    )}
                  </div>
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-10" />
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Mention</div>
                  {mention ? <MentionBadge mention={mention} /> : <Dash />}
                </div>
                <Separator orientation="vertical" className="hidden sm:block h-10" />
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">Statut</div>
                  {statut ? <StatutBadge statut={statut} /> : <Dash />}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Dash() {
  return <span className="text-muted-foreground">—</span>;
}

function mentionLabel(m: Mention): string {
  switch (m) {
    case "ajourne":
      return "Ajourné";
    case "passable":
      return "Passable";
    case "assez_bien":
      return "Assez bien";
    case "bien":
      return "Bien";
    case "tres_bien":
      return "Très bien";
  }
}

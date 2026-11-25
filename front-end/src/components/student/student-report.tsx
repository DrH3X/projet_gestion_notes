"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Award,
  BookOpen,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  XCircle,
  FileText,
  IdCard,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { MentionBadge, NoteValue, StatutBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bilan, Dossier, Mention, Note, TypeNote } from "@/types";

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

function barColorForMoyenne(m: number): string {
  if (m >= 16) return "oklch(0.68 0.15 162)";
  if (m >= 14) return "oklch(0.55 0.19 259)";
  if (m >= 12) return "oklch(0.7 0.13 230)";
  if (m >= 10) return "oklch(0.78 0.16 70)";
  return "oklch(0.58 0.22 27)";
}

function fmt(v: number | undefined): string {
  if (v === undefined) return "—";
  return v.toFixed(2);
}

const TYPE_COLORS: Record<TypeNote, string> = {
  DS: "oklch(0.55 0.19 259)",
  examen: "oklch(0.68 0.15 162)",
  TP: "oklch(0.78 0.16 70)",
};

const TYPE_LABELS: Record<TypeNote, string> = {
  DS: "DS",
  examen: "Examen",
  TP: "TP",
};

export function StudentReport() {
  const me = useAsync<Dossier>(() => api.students.me(), []);
  const bilan = useAsync<Bilan>(() => api.notes.myBilan(), []);
  const notes = useAsync<Note[]>(() => api.notes.myList(), []);

  const loading = me.loading || bilan.loading || notes.loading;
  const firstError = me.error || bilan.error || notes.error;

  const rows = useMemo(
    () => groupNotesByMatiere(notes.data ?? []),
    [notes.data]
  );

  const barData = useMemo(
    () =>
      rows.map((r) => ({
        name: r.matiereIntitule,
        moyenne: Number(r.moyenne.toFixed(2)),
        fill: barColorForMoyenne(r.moyenne),
      })),
    [rows]
  );

  const pieData = useMemo(() => {
    const counts: Record<TypeNote, number> = { DS: 0, examen: 0, TP: 0 };
    for (const n of notes.data ?? []) {
      counts[n.type] = (counts[n.type] ?? 0) + 1;
    }
    return (Object.keys(counts) as TypeNote[])
      .map((k) => ({ name: TYPE_LABELS[k], value: counts[k], key: k }))
      .filter((d) => d.value > 0);
  }, [notes.data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Bilan académique"
          description="Votre synthèse académique : moyenne, mention, statut et répartition."
        />
        <CardGridSkeleton count={4} />
        <TableSkeleton rows={5} cols={6} />
      </div>
    );
  }

  if (firstError) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Bilan académique"
          description="Votre synthèse académique : moyenne, mention, statut et répartition."
        />
        <ErrorState
          error={firstError}
          onRetry={() => {
            me.refetch();
            bilan.refetch();
            notes.refetch();
          }}
        />
      </div>
    );
  }

  const dossier = me.data;
  const b = bilan.data;
  const moyenne = b?.moyenne ?? null;
  const mention = b?.mention ?? (moyenne !== null ? computeMention(moyenne) : null);
  const statut = b?.statut ?? (moyenne !== null ? (moyenne >= 10 ? "admis" : "ajourne") : null);
  const nbMatieres = b?.nbMatieres ?? rows.length;
  const hasNotes = (notes.data?.length ?? 0) > 0;

  const progressPct = moyenne !== null ? Math.min(100, (moyenne / 20) * 100) : 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Bilan académique"
        description="Votre synthèse académique : moyenne, mention, statut et répartition."
      />

      {/* Report card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-3">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <FileText className="h-3.5 w-3.5" />
                  Relevé de notes
                </div>
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">
                    {dossier
                      ? `${dossier.prenom} ${dossier.nom}`
                      : b
                      ? `${b.etudiantPrenom} ${b.etudiantNom}`
                      : "—"}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                    <span>
                      Classe{" "}
                      <span className="font-medium text-foreground">
                        {dossier?.classe ?? b?.classe ?? "—"}
                      </span>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <IdCard className="h-3.5 w-3.5" />
                      Matricule{" "}
                      <span className="font-mono text-xs font-medium text-foreground">
                        {dossier?.matricule ?? "—"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {mention && <MentionBadge mention={mention} />}
                  {statut && <StatutBadge statut={statut} />}
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">
                    Moyenne générale
                  </div>
                  <div className="text-4xl font-semibold tabular-nums leading-none">
                    {moyenne !== null ? moyenne.toFixed(2) : "—"}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">/ 20</div>
                </div>
                {moyenne !== null && (
                  <div className="hidden sm:block w-px h-16 bg-border" />
                )}
                {moyenne !== null && (
                  <div className="hidden sm:flex flex-col items-center gap-1">
                    <ProgressRing value={progressPct} label={`${Math.round(progressPct)}%`} />
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </div>
      </Card>

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Moyenne générale"
          value={moyenne !== null ? moyenne.toFixed(2) : "—"}
          hint={moyenne !== null ? "/ 20" : "Aucune note"}
          icon={TrendingUp}
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
          icon={statut === "admis" ? CheckCircle2 : XCircle}
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

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              Notes par matière
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Moyenne matière, colorée selon la mention.
            </p>
          </CardHeader>
          <CardContent>
            {!hasNotes ? (
              <EmptyState
                title="Aucune note disponible"
                description="Vos moyennes par matière apparaîtront ici."
              />
            ) : (
              <ResponsiveContainer width="100%" height={Math.max(220, barData.length * 36)}>
                <BarChart
                  data={barData}
                  layout="vertical"
                  margin={{ left: 8, right: 24, top: 4, bottom: 4 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    horizontal={false}
                    stroke="var(--border)"
                  />
                  <XAxis
                    type="number"
                    domain={[0, 20]}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={140}
                    tick={{ fontSize: 11 }}
                    stroke="var(--muted-foreground)"
                  />
                  <Tooltip
                    cursor={{ fill: "var(--muted)" }}
                    contentStyle={{
                      borderRadius: 8,
                      border: "1px solid var(--border)",
                      fontSize: 12,
                    }}
                    formatter={(v: number) => [`${v.toFixed(2)} / 20`, "Moyenne"]}
                  />
                  <Bar dataKey="moyenne" radius={[0, 4, 4, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" />
              Répartition par type de note
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Nombre de notes saisies par type (DS, Examen, TP).
            </p>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyState
                title="Aucune note disponible"
                description="Aucune note à répartir."
              />
            ) : (
              <div className="space-y-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                    >
                      {pieData.map((d) => (
                        <Cell key={d.key} fill={TYPE_COLORS[d.key as TypeNote]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        borderRadius: 8,
                        border: "1px solid var(--border)",
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-4 justify-center">
                  {pieData.map((d) => (
                    <div key={d.key} className="flex items-center gap-1.5 text-xs">
                      <span
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ background: TYPE_COLORS[d.key as TypeNote] }}
                      />
                      <span className="text-muted-foreground">{d.name}</span>
                      <span className="font-medium">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed table */}
      <Card className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium">Détail par matière</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Pour chaque matière : coefficient, notes par type, moyenne et mention.
          </p>
        </div>
        {!hasNotes ? (
          <CardContent className="py-2">
            <EmptyState
              title="Aucune note à afficher"
              description="Les résultats apparaîtront dès qu'une note sera saisie."
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
                  <TableHead className="text-center">Moyenne</TableHead>
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

/** Simple circular progress ring built with SVG (no extra deps). */
function ProgressRing({ value, label }: { value: number; label: string }) {
  const size = 64;
  const stroke = 6;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <span className="absolute text-xs font-medium tabular-nums">{label}</span>
    </div>
  );
}

// force-recompile marker

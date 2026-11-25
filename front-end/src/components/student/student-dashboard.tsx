"use client";

import { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BookOpen,
  GraduationCap,
  TrendingUp,
  Award,
  CheckCircle2,
  XCircle,
  Sparkles,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { MentionBadge, StatutBadge } from "@/components/shared/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Bilan, Dossier, Mention, Note } from "@/types";

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
    });
  }
  return rows.sort((a, b) => a.matiereIntitule.localeCompare(b.matiereIntitule));
}

function barColorForMoyenne(m: number): string {
  if (m >= 16) return "oklch(0.68 0.15 162)"; // tres_bien — emerald
  if (m >= 14) return "oklch(0.55 0.19 259)"; // bien — primary navy
  if (m >= 12) return "oklch(0.7 0.13 230)"; // assez_bien — sky
  if (m >= 10) return "oklch(0.78 0.16 70)"; // passable — amber
  return "oklch(0.58 0.22 27)"; // ajourne — rose
}

export function StudentDashboard() {
  const { user } = useAuth();

  const me = useAsync<Dossier>(() => api.students.me(), []);
  const bilan = useAsync<Bilan>(() => api.notes.myBilan(), []);
  const notes = useAsync<Note[]>(() => api.notes.myList(), []);

  const loading = me.loading || bilan.loading || notes.loading;
  const firstError = me.error || bilan.error || notes.error;

  const matiereRows = useMemo(
    () => groupNotesByMatiere(notes.data ?? []),
    [notes.data]
  );

  const chartData = useMemo(
    () =>
      matiereRows.map((r) => ({
        name: r.matiereIntitule,
        moyenne: Number(r.moyenne.toFixed(2)),
        fill: barColorForMoyenne(r.moyenne),
      })),
    [matiereRows]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Accueil"
          description="Votre espace académique personnel."
        />
        <CardGridSkeleton count={4} />
      </div>
    );
  }

  if (firstError) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Accueil"
          description="Votre espace académique personnel."
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
  const prenom = dossier?.prenom ?? user?.prenom ?? "";
  const nom = dossier?.nom ?? user?.nom ?? "";
  const classe = dossier?.classe ?? user?.classe ?? "—";
  const matricule = dossier?.matricule ?? "—";

  const moyenne = b?.moyenne ?? null;
  const mention = b?.mention ?? (moyenne !== null ? computeMention(moyenne) : null);
  const statut = b?.statut ?? (moyenne !== null ? (moyenne >= 10 ? "admis" : "ajourne") : null);
  const nbMatieres = b?.nbMatieres ?? matiereRows.length;

  const hasNotes = (notes.data?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Accueil"
        description="Bienvenue dans votre espace académique personnel."
      />

      {/* Welcome hero card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardContent className="px-6 py-6 sm:px-8 sm:py-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                  <Sparkles className="h-3.5 w-3.5" />
                  Espace étudiant
                </div>
                <h2 className="text-2xl font-semibold tracking-tight">
                  Bienvenue, {prenom} {nom}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Classe{" "}
                  <span className="font-medium text-foreground">{classe}</span>
                  {" · "}
                  Matricule{" "}
                  <span className="font-mono text-xs font-medium text-foreground">
                    {matricule}
                  </span>
                </p>
              </div>
              {b && (
                <div className="flex flex-col items-start sm:items-end gap-2">
                  <div className="text-xs text-muted-foreground">Moyenne générale</div>
                  <div className="text-3xl font-semibold tabular-nums">
                    {b.moyenne.toFixed(2)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / 20
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {mention && <MentionBadge mention={mention} />}
                    {statut && <StatutBadge statut={statut} />}
                  </div>
                </div>
              )}
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
          hint={mention ? "Mention actuelle" : undefined}
          icon={Award}
          accent="info"
        />
        <StatCard
          label="Statut"
          value={statut === "admis" ? "Admis" : statut === "ajourne" ? "Ajourné" : "—"}
          hint={statut ? "Année en cours" : undefined}
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

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            Moyenne par matière
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Vue d'ensemble de vos résultats par matière.
          </p>
        </CardHeader>
        <CardContent>
          {!hasNotes ? (
            <EmptyState
              title="Aucune note pour le moment"
              description="Vos moyennes par matière apparaîtront ici dès qu'un enseignant aura saisi des notes."
            />
          ) : (
            <div className="space-y-4">
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 36)}>
                <BarChart
                  data={chartData}
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
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={d.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              <Separator />
              <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                <LegendDot color={barColorForMoyenne(17)} label="Très bien (≥16)" />
                <LegendDot color={barColorForMoyenne(15)} label="Bien (14-16)" />
                <LegendDot color={barColorForMoyenne(13)} label="Assez bien (12-14)" />
                <LegendDot color={barColorForMoyenne(11)} label="Passable (10-12)" />
                <LegendDot color={barColorForMoyenne(8)} label="Ajourné (<10)" />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
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

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-sm" style={{ background: color }} />
      <span>{label}</span>
    </div>
  );
}

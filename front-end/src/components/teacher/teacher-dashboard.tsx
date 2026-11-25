"use client";

import { useMemo } from "react";
import {
  BookOpen,
  Users,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
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
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import type { Bilan, Dossier, Matiere, Note } from "@/types";

const MENTION_LABELS: Record<string, string> = {
  ajourne: "Ajourné",
  passable: "Passable",
  assez_bien: "Assez bien",
  bien: "Bien",
  tres_bien: "Très bien",
};

const MENTION_COLORS: Record<string, string> = {
  ajourne: "oklch(0.58 0.22 27)",
  passable: "oklch(0.78 0.16 70)",
  assez_bien: "oklch(0.7 0.13 230)",
  bien: "oklch(0.55 0.19 259)",
  tres_bien: "oklch(0.68 0.15 162)",
};

export function TeacherDashboard() {
  // Parallel data fetches against the SOAP-backed API client.
  const subjects = useAsync<Matiere[]>(() => api.subjects.myList(), []);
  const students = useAsync<Dossier[]>(() => api.students.teacherList(), []);
  const notes = useAsync<Note[]>(() => api.notes.teacherList(), []);
  const bilans = useAsync<Bilan[]>(() => api.notes.averages(), []);

  const loading =
    subjects.loading || students.loading || notes.loading || bilans.loading;
  const firstError =
    subjects.error || students.error || notes.error || bilans.error;

  const stats = useMemo(() => {
    const subs = subjects.data ?? [];
    const studs = students.data ?? [];
    const nts = notes.data ?? [];
    const bils = bilans.data ?? [];
    const avg =
      bils.length > 0
        ? bils.reduce((s, b) => s + b.moyenne, 0) / bils.length
        : null;
    return {
      nbSubs: subs.length,
      nbStuds: studs.length,
      nbNotes: nts.length,
      avg,
    };
  }, [subjects.data, students.data, notes.data, bilans.data]);

  // Chart data: count of notes per matiere.
  const notesPerMatiere = useMemo(() => {
    const nts = notes.data ?? [];
    const counts: Record<string, number> = {};
    for (const n of nts) {
      const key = n.matiereIntitule || n.matiereId;
      counts[key] = (counts[key] || 0) + 1;
    }
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [notes.data]);

  // Chart data: repartition of mentions (from bilans).
  const mentionData = useMemo(() => {
    const bils = bilans.data ?? [];
    const counts: Record<string, number> = {};
    for (const b of bils) counts[b.mention] = (counts[b.mention] || 0) + 1;
    return Object.entries(counts).map(([k, v]) => ({
      name: MENTION_LABELS[k] ?? k,
      value: v,
      key: k,
    }));
  }, [bilans.data]);

  // Top students by moyenne (descending, max 8).
  const ranking = useMemo(() => {
    const bils = (bilans.data ?? []).slice().sort((a, b) => b.moyenne - a.moyenne);
    return bils.slice(0, 8);
  }, [bilans.data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Tableau de bord"
          description="Vue d'ensemble de votre activité d'enseignement."
        />
        <CardGridSkeleton count={4} />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  if (firstError) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Tableau de bord"
          description="Vue d'ensemble de votre activité d'enseignement."
        />
        <ErrorState
          error={firstError}
          onRetry={() => {
            subjects.refetch();
            students.refetch();
            notes.refetch();
            bilans.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité d'enseignement."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Mes matières"
          value={stats.nbSubs}
          hint="matières dont vous êtes responsable"
          icon={BookOpen}
          accent="default"
        />
        <StatCard
          label="Mes étudiants"
          value={stats.nbStuds}
          hint="étudiants concernés"
          icon={Users}
          accent="info"
        />
        <StatCard
          label="Notes saisies"
          value={stats.nbNotes}
          hint="dans vos matières"
          icon={ClipboardList}
          accent="success"
        />
        <StatCard
          label="Moyenne de mes étudiants"
          value={stats.avg !== null ? stats.avg.toFixed(2) : "—"}
          hint={stats.avg !== null ? "/ 20" : "Aucune note"}
          icon={TrendingUp}
          accent={
            stats.avg === null
              ? "default"
              : stats.avg >= 10
              ? "success"
              : "danger"
          }
        />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Notes par matière */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">
            Répartition des notes par matière
          </h3>
          {notesPerMatiere.length === 0 ? (
            <EmptyState
              title="Aucune note"
              description="Aucune note n'a encore été saisie dans vos matières."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={notesPerMatiere}
                margin={{ left: -10, right: 10 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v} note(s)`, "Notes"]}
                />
                <Bar
                  dataKey="value"
                  fill="oklch(0.55 0.19 259)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Répartition des mentions */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">
            Répartition des mentions
          </h3>
          {mentionData.length === 0 ? (
            <EmptyState
              title="Aucune mention"
              description="Aucun bilan disponible pour vos étudiants."
            />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie
                    data={mentionData}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                  >
                    {mentionData.map((d) => (
                      <Cell
                        key={d.key}
                        fill={MENTION_COLORS[d.key] ?? "oklch(0.55 0.19 259)"}
                      />
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
              <div className="mt-3 flex flex-wrap gap-3 justify-center">
                {mentionData.map((d) => (
                  <div
                    key={d.key}
                    className="flex items-center gap-1.5 text-xs"
                  >
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{
                        background:
                          MENTION_COLORS[d.key] ?? "oklch(0.55 0.19 259)",
                      }}
                    />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="font-medium">{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Top étudiants */}
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Top étudiants</h3>
          {ranking.length === 0 ? (
            <EmptyState
              title="Aucun résultat"
              description="Les résultats apparaîtront dès qu'une note sera saisie."
            />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ranking} margin={{ left: -10, right: 10 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--border)"
                />
                <XAxis
                  dataKey="etudiantNom"
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis
                  domain={[0, 20]}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => [`${v}/20`, "Moyenne"]}
                />
                <Bar dataKey="moyenne" radius={[4, 4, 0, 0]}>
                  {ranking.map((b, i) => (
                    <Cell
                      key={i}
                      fill={
                        b.moyenne >= 16
                          ? "oklch(0.68 0.15 162)"
                          : b.moyenne >= 10
                          ? "oklch(0.55 0.19 259)"
                          : "oklch(0.58 0.22 27)"
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}

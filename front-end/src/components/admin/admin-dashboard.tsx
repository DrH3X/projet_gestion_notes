"use client";

import { useMemo } from "react";
import {
  Users,
  GraduationCap,
  BookOpen,
  UserCog,
  TrendingUp,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { api } from "@/lib/api-client";
import { useAuth } from "@/store/auth-store";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { StatutBadge, MentionBadge } from "@/components/shared/badges";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Bilan, Compte, Dossier, Matiere } from "@/types";

const ROLE_COLORS: Record<string, string> = {
  etudiant: "oklch(0.55 0.19 259)",
  enseignant: "oklch(0.7 0.13 230)",
  administrateur: "oklch(0.78 0.16 70)",
};

const MENTION_LABELS: Record<string, string> = {
  ajourne: "Ajourné",
  passable: "Passable",
  assez_bien: "Assez bien",
  bien: "Bien",
  tres_bien: "Très bien",
};

export function AdminDashboard() {
  // Parallel data fetches (each triggers the same in-process backend).
  const accounts = useAsync<Compte[]>(() => api.accounts.list(), []);
  const students = useAsync<Dossier[]>(() => api.students.list(), []);
  const subjects = useAsync<Matiere[]>(() => api.subjects.list(), []);
  const bilans = useAsync<Bilan[]>(() => api.notes.averages(), []);

  const loading = accounts.loading || students.loading || subjects.loading || bilans.loading;
  const firstError = accounts.error || students.error || subjects.error || bilans.error;

  const stats = useMemo(() => {
    const accts = accounts.data ?? [];
    const studs = students.data ?? [];
    const subs = subjects.data ?? [];
    const bils = bilans.data ?? [];
    const nbEns = accts.filter((a) => a.role === "enseignant").length;
    const nbEtu = accts.filter((a) => a.role === "etudiant").length;
    const admitted = bils.filter((b) => b.statut === "admis").length;
    const ajourne = bils.filter((b) => b.statut === "ajourne").length;
    const avg =
      bils.length > 0
        ? bils.reduce((s, b) => s + b.moyenne, 0) / bils.length
        : null;
    return {
      nbEtu,
      nbEns,
      nbAccounts: accts.length,
      nbSubs: subs.length,
      nbDossiers: studs.length,
      admitted,
      ajourne,
      avg,
    };
  }, [accounts.data, students.data, subjects.data, bilans.data]);

  const roleData = useMemo(() => {
    const accts = accounts.data ?? [];
    const counts: Record<string, number> = {
      etudiant: 0,
      enseignant: 0,
      administrateur: 0,
    };
    for (const a of accts) counts[a.role] = (counts[a.role] || 0) + 1;
    return [
      { name: "Étudiants", value: counts.etudiant, key: "etudiant" },
      { name: "Enseignants", value: counts.enseignant, key: "enseignant" },
      { name: "Administrateurs", value: counts.administrateur, key: "administrateur" },
    ].filter((d) => d.value > 0);
  }, [accounts.data]);

  const mentionData = useMemo(() => {
    const bils = bilans.data ?? [];
    const counts: Record<string, number> = {};
    for (const b of bils) counts[b.mention] = (counts[b.mention] || 0) + 1;
    return Object.entries(counts).map(([k, v]) => ({
      name: MENTION_LABELS[k] ?? k,
      value: v,
    }));
  }, [bilans.data]);

  const ranking = useMemo(() => {
    const bils = (bilans.data ?? []).slice().sort((a, b) => b.moyenne - a.moyenne);
    return bils.slice(0, 8);
  }, [bilans.data]);

  if (loading) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Tableau de bord" description="Vue d'ensemble de la plateforme." />
        <CardGridSkeleton count={4} />
        <TableSkeleton rows={5} cols={4} />
      </div>
    );
  }

  if (firstError) {
    return (
      <div className="space-y-6">
        <SectionHeader title="Tableau de bord" description="Vue d'ensemble de la plateforme." />
        <ErrorState
          error={firstError}
          onRetry={() => {
            accounts.refetch();
            students.refetch();
            subjects.refetch();
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
        description="Vue d'ensemble de la scolarité : comptes, matières et résultats."
      />

      {/* Stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Étudiants" value={stats.nbEtu} hint={`${stats.nbDossiers} dossiers`} icon={Users} accent="info" />
        <StatCard label="Enseignants" value={stats.nbEns} icon={GraduationCap} accent="default" />
        <StatCard label="Comptes totaux" value={stats.nbAccounts} icon={UserCog} accent="warning" />
        <StatCard label="Matières" value={stats.nbSubs} icon={BookOpen} accent="success" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Moyenne générale"
          value={stats.avg !== null ? stats.avg.toFixed(2) : "—"}
          hint={stats.avg !== null ? "/ 20" : "Aucune note"}
          icon={TrendingUp}
          accent={stats.avg === null ? "default" : stats.avg >= 10 ? "success" : "danger"}
        />
        <StatCard label="Étudiants admis" value={stats.admitted} icon={CheckCircle2} accent="success" />
        <StatCard label="Étudiants ajournés" value={stats.ajourne} icon={XCircle} accent="danger" />
        <StatCard label="Matières notées" value={bilans.data?.length ?? 0} hint="étudiants évalués" icon={BookOpen} accent="info" />
      </div>

      {/* Charts */}
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Répartition des comptes</h3>
          {roleData.length === 0 ? (
            <EmptyState title="Aucun compte" description="Aucun compte à afficher." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={roleData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                >
                  {roleData.map((d) => (
                    <Cell key={d.key} fill={ROLE_COLORS[d.key]} />
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
          )}
          <div className="mt-3 flex flex-wrap gap-3 justify-center">
            {roleData.map((d) => (
              <div key={d.key} className="flex items-center gap-1.5 text-xs">
                <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLORS[d.key] }} />
                <span className="text-muted-foreground">{d.name}</span>
                <span className="font-medium">{d.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Répartition des mentions</h3>
          {mentionData.length === 0 ? (
            <EmptyState title="Aucune mention" description="Aucun bilan disponible." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mentionData} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                <XAxis type="number" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fontSize: 11 }}
                  stroke="var(--muted-foreground)"
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: 8,
                    border: "1px solid var(--border)",
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="oklch(0.55 0.19 259)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">Top résultats</h3>
          {ranking.length === 0 ? (
            <EmptyState title="Aucun résultat" description="Aucune note saisie pour le moment." />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={ranking} margin={{ left: -10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="etudiantNom"
                  tick={{ fontSize: 10 }}
                  stroke="var(--muted-foreground)"
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                  height={50}
                />
                <YAxis domain={[0, 20]} tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" />
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

      {/* Detailed results table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="text-sm font-medium">Résultats détaillés</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Moyenne, mention et statut de chaque étudiant évalué.
          </p>
        </div>
        {ranking.length === 0 ? (
          <div className="p-5">
            <EmptyState title="Aucun résultat à afficher" description="Les résultats apparaîtront dès qu'une note sera saisie." />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Étudiant</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead className="text-right">Moyenne</TableHead>
                <TableHead>Mention</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((b) => (
                <TableRow key={b.etudiantId}>
                  <TableCell className="font-medium">
                    {b.etudiantNom} {b.etudiantPrenom}
                  </TableCell>
                  <TableCell>{b.classe || "—"}</TableCell>
                  <TableCell className="text-right font-mono">{b.moyenne.toFixed(2)}</TableCell>
                  <TableCell><MentionBadge mention={b.mention} /></TableCell>
                  <TableCell><StatutBadge statut={b.statut} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  );
}

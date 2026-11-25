"use client";

import { useMemo, useState } from "react";
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
import { Trophy, CheckCircle2, XCircle, TrendingUp } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { CardGridSkeleton, TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { EmptyState } from "@/components/shared/empty-state";
import { DataTable, type Column } from "@/components/tables/data-table";
import { MentionBadge, StatutBadge } from "@/components/shared/badges";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Bilan } from "@/types";

const CLASSES = ["1A", "2A", "3A", "4A", "5A", "L1", "L2", "L3", "M1", "M2"];

export function AdminResults() {
  const [filterClasse, setFilterClasse] = useState("");

  const bilans = useAsync<Bilan[]>(
    () => api.notes.averages(filterClasse),
    [filterClasse],
  );

  async function reload() {
    await bilans.refetch();
  }

  // Distinct classes from loaded bilans (used to enrich the filter dropdown).
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    for (const b of bilans.data ?? []) {
      if (b.classe) set.add(b.classe);
    }
    return Array.from(set).sort();
  }, [bilans.data]);

  // Rank the bilans by moyenne (desc) client-side.
  const ranked = useMemo(() => {
    const arr = (bilans.data ?? []).slice().sort((a, b) => b.moyenne - a.moyenne);
    return arr.map((b, i) => ({ ...b, rang: i + 1 }));
  }, [bilans.data]);

  const stats = useMemo(() => {
    const arr = ranked;
    if (arr.length === 0) {
      return { nbEvalues: 0, nbAdmis: 0, nbAjournes: 0, moyenne: null };
    }
    const nbAdmis = arr.filter((b) => b.statut === "admis").length;
    const nbAjournes = arr.filter((b) => b.statut === "ajourne").length;
    const moyenne =
      arr.reduce((s, b) => s + b.moyenne, 0) / arr.length;
    return {
      nbEvalues: arr.length,
      nbAdmis,
      nbAjournes,
      moyenne,
    };
  }, [ranked]);

  const columns: Column<(Bilan & { rang: number })>[] = [
    {
      key: "rang",
      header: "Rang",
      className: "w-[80px]",
      sortValue: (r) => r.rang,
      cell: (r) => (
        <Badge
          variant={r.rang <= 3 ? "default" : "outline"}
          className="font-mono"
        >
          #{r.rang}
        </Badge>
      ),
    },
    {
      key: "etudiant",
      header: "Étudiant",
      sortValue: (r) => `${r.etudiantNom} ${r.etudiantPrenom}`,
      cell: (r) => (
        <div>
          <p className="font-medium">
            {r.etudiantNom} {r.etudiantPrenom}
          </p>
          <p className="text-xs text-muted-foreground font-mono">
            {r.etudiantId}
          </p>
        </div>
      ),
    },
    {
      key: "classe",
      header: "Classe",
      className: "w-[110px]",
      cell: (r) => (
        <Badge variant="secondary">{r.classe || "—"}</Badge>
      ),
      sortValue: (r) => r.classe,
    },
    {
      key: "moyenne",
      header: "Moyenne",
      className: "w-[110px] text-right",
      sortValue: (r) => r.moyenne,
      cell: (r) => (
        <span className="font-mono text-sm">
          {r.moyenne.toFixed(2)}
          <span className="text-xs text-muted-foreground"> / 20</span>
        </span>
      ),
    },
    {
      key: "mention",
      header: "Mention",
      className: "w-[140px]",
      cell: (r) => <MentionBadge mention={r.mention} />,
      sortValue: (r) => r.mention,
    },
    {
      key: "statut",
      header: "Statut",
      className: "w-[120px]",
      cell: (r) => <StatutBadge statut={r.statut} />,
      sortValue: (r) => r.statut,
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Moyennes & Résultats"
        description="Classement, mentions et statuts de vos étudiants."
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Classe :</span>
        <Select
          value={filterClasse || "all"}
          onValueChange={(v) => setFilterClasse(v === "all" ? "" : v)}
        >
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {(availableClasses.length ? availableClasses : CLASSES).map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {bilans.loading ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Étudiants évalués"
            value={stats.nbEvalues}
            hint={filterClasse ? `classe ${filterClasse}` : "toutes classes"}
            icon={Trophy}
            accent="default"
          />
          <StatCard
            label="Admis"
            value={stats.nbAdmis}
            icon={CheckCircle2}
            accent="success"
          />
          <StatCard
            label="Ajournés"
            value={stats.nbAjournes}
            icon={XCircle}
            accent="danger"
          />
          <StatCard
            label="Moyenne générale"
            value={
              stats.moyenne !== null ? stats.moyenne.toFixed(2) : "—"
            }
            hint={stats.moyenne !== null ? "/ 20" : "Aucune note"}
            icon={TrendingUp}
            accent={
              stats.moyenne === null
                ? "default"
                : stats.moyenne >= 10
                ? "success"
                : "danger"
            }
          />
        </div>
      )}

      {/* Moyennes bar chart */}
      {bilans.loading ? null : bilans.error ? null : ranked.length === 0 ? null : (
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-medium mb-4">
            Moyennes par étudiant
          </h3>
          <ResponsiveContainer width="100%" height={Math.max(220, ranked.length * 28)}>
            <BarChart
              data={ranked}
              layout="vertical"
              margin={{ left: 10, right: 20 }}
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
                dataKey="etudiantNom"
                width={100}
                tick={{ fontSize: 11 }}
                stroke="var(--muted-foreground)"
              />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 12,
                }}
                formatter={(v: number) => [`${v.toFixed(2)} / 20`, "Moyenne"]}
              />
              <Bar dataKey="moyenne" radius={[0, 4, 4, 0]}>
                {ranked.map((b, i) => (
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
        </div>
      )}

      {/* Ranking table */}
      {bilans.loading ? (
        <TableSkeleton rows={6} cols={6} />
      ) : bilans.error ? (
        <ErrorState error={bilans.error} onRetry={reload} />
      ) : ranked.length === 0 ? (
        <EmptyState
          title="Aucun résultat"
          description="Aucun bilan n'est disponible pour vos étudiants. Les résultats apparaîtront dès qu'une note sera saisie."
        />
      ) : (
        <DataTable
          data={ranked}
          columns={columns}
          rowKey={(r) => r.etudiantId}
          searchKeys={[
            (r) => `${r.etudiantNom} ${r.etudiantPrenom} ${r.classe}`,
          ]}
          searchPlaceholder="Rechercher un étudiant…"
          emptyTitle="Aucun résultat"
          emptyDescription="Aucun étudiant ne correspond à votre recherche."
        />
      )}
    </div>
  );
}

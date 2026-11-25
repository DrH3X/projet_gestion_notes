"use client";

import { useMemo, useState } from "react";
import { Eye, Users } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Dossier } from "@/types";

const CLASSES = ["1A", "2A", "3A", "4A", "5A", "L1", "L2", "L3", "M1", "M2"];

export function TeacherStudents() {
  const [filterClasse, setFilterClasse] = useState("");
  const [viewTarget, setViewTarget] = useState<Dossier | null>(null);

  const list = useAsync<Dossier[]>(
    () => api.students.teacherList(filterClasse),
    [filterClasse],
  );

  async function reload() {
    await list.refetch();
  }

  // Build the list of distinct classes from the loaded students (so the
  // filter dropdown adapts to whatever the backend actually returned).
  const availableClasses = useMemo(() => {
    const set = new Set<string>();
    for (const s of list.data ?? []) {
      if (s.classe) set.add(s.classe);
    }
    return Array.from(set).sort();
  }, [list.data]);

  const columns: Column<Dossier>[] = [
    {
      key: "name",
      header: "Étudiant",
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nom} {r.prenom}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "matricule",
      header: "Matricule",
      className: "w-[140px]",
      cell: (r) => <span className="font-mono text-xs">{r.matricule || "—"}</span>,
      sortValue: (r) => r.matricule,
    },
    {
      key: "classe",
      header: "Classe",
      className: "w-[120px]",
      cell: (r) => <Badge variant="secondary">{r.classe || "—"}</Badge>,
      sortValue: (r) => r.classe,
    },
    {
      key: "naissance",
      header: "Naissance",
      className: "w-[140px]",
      cell: (r) => (
        <span className="text-xs text-muted-foreground">
          {r.dateNaissance || "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "w-[60px]",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTarget(r)} title="Consulter">
            <Eye className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mes étudiants"
        description="Les étudiants concernés par vos matières."
      />

      <StatCard
        label="Étudiants concernés"
        value={list.data?.length ?? 0}
        hint={filterClasse ? `classe ${filterClasse}` : "toutes classes"}
        icon={Users}
        accent="info"
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

      {list.loading ? (
        <TableSkeleton rows={6} cols={4} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={reload} />
      ) : (
        <DataTable
          data={list.data ?? []}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={[(r) => `${r.nom} ${r.prenom} ${r.matricule} ${r.email}`]}
          searchPlaceholder="Rechercher par nom, matricule, email…"
          emptyTitle="Aucun étudiant"
          emptyDescription="Aucun étudiant ne correspond à votre recherche ou à vos matières."
        />
      )}

      {/* View sheet */}
      {viewTarget && (
        <Sheet open onOpenChange={(o) => !o && setViewTarget(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Dossier étudiant</SheetTitle>
              <SheetDescription>
                Consultation (opération SOAP listerMesEtudiants).
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow
                label="Nom"
                value={`${viewTarget.nom} ${viewTarget.prenom}`}
              />
              <DetailRow label="Email" value={viewTarget.email} />
              <DetailRow
                label="Matricule"
                value={viewTarget.matricule || "—"}
                mono
              />
              <DetailRow
                label="Classe"
                value={viewTarget.classe || "—"}
              />
              <DetailRow
                label="Date de naissance"
                value={viewTarget.dateNaissance || "—"}
              />
              <DetailRow
                label="Adresse"
                value={viewTarget.adresse || "—"}
              />
              <DetailRow label="Identifiant dossier" value={viewTarget.id} mono />
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium text-right"}>
        {value}
      </span>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Pencil, Eye, Loader2, BookOpen, Scale } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { useSectionsClasses } from "@/hooks/use-sections-classes";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Matiere, SoapFault } from "@/types";

const schema = z.object({
  intitule: z.string().min(1, "Intitulé requis"),
  coefficient: z
    .number()
    .refine((v) => !Number.isNaN(v) && v > 0, {
      message: "Le coefficient doit être un nombre strictement > 0",
    }),
});

type FormValues = z.infer<typeof schema>;

export function TeacherSubjects() {
  const [editTarget, setEditTarget] = useState<Matiere | null>(null);
  const [viewTarget, setViewTarget] = useState<Matiere | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [filterSection, setFilterSection] = useState("all");
  const [filterClasse, setFilterClasse] = useState("all");
  const { sections, classes, loading: sectionsClassesLoading } = useSectionsClasses();

  const list = useAsync<Matiere[]>(() => api.subjects.myList(), []);
  const filteredClasses = filterSection === "all"
    ? classes
    : classes.filter((classe) => classe.sectionId === filterSection);
  const filteredSubjects = (list.data ?? []).filter((subject) => {
    if (filterSection !== "all" && subject.sectionId !== filterSection) return false;
    if (filterClasse !== "all" && subject.classeId !== filterClasse) return false;
    return true;
  });

  async function reload() {
    await list.refetch();
  }

  const stats = useMemo(() => {
    const subs = filteredSubjects;
    const totalCoef = subs.reduce((s, m) => s + (m.coefficient || 0), 0);
    return { total: subs.length, totalCoef };
  }, [filteredSubjects]);

  async function onEdit(values: FormValues) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.subjects.update({
        id: editTarget.id,
        intitule: values.intitule,
        coefficient: values.coefficient,
        // enseignantId is intentionally NOT sent — only admin can reassign.
      });
      toast.success("Matière modifiée");
      setEditTarget(null);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la modification");
    } finally {
      setSubmitting(false);
    }
  }

  const columns: Column<Matiere>[] = [
    {
      key: "section",
      header: "Section",
      sortValue: (r) => r.sectionNom || "",
      cell: (r) => <span>{r.sectionNom || "Non renseignée"}</span>,
    },
    {
      key: "classe",
      header: "Classe",
      sortValue: (r) => r.classeNom || "",
      cell: (r) => <span>{r.classeNom || "Non renseignée"}</span>,
    },
    {
      key: "intitule",
      header: "Intitulé",
      sortValue: (r) => r.intitule,
      cell: (r) => <span className="font-medium">{r.intitule}</span>,
    },
    {
      key: "coefficient",
      header: "Coefficient",
      className: "w-[140px]",
      sortValue: (r) => r.coefficient,
      cell: (r) => (
        <Badge variant="secondary" className="font-mono">×{r.coefficient}</Badge>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "w-[100px]",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTarget(r)} title="Consulter">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(r)} title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Mes matières"
        description="Les matières dont vous êtes responsable."
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs">Section</Label>
          <Select
            value={filterSection}
            onValueChange={(value) => {
              setFilterSection(value);
              setFilterClasse("all");
            }}
            disabled={sectionsClassesLoading}
          >
            <SelectTrigger><SelectValue placeholder="Toutes les sections" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sections</SelectItem>
              {sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>{section.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Classe</Label>
          <Select
            value={filterClasse}
            onValueChange={setFilterClasse}
            disabled={sectionsClassesLoading || filteredClasses.length === 0}
          >
            <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les classes</SelectItem>
              {filteredClasses.map((classe) => (
                <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Mes matières" value={stats.total} icon={BookOpen} accent="default" />
        <StatCard label="Somme des coefficients" value={stats.totalCoef} icon={Scale} accent="info" />
      </div>

      {list.loading ? (
        <TableSkeleton rows={6} cols={3} />
      ) : list.error ? (
        <ErrorState error={list.error} onRetry={reload} />
      ) : (
        <DataTable
          data={filteredSubjects}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={[(r) => `${r.intitule} ${r.sectionNom ?? ""} ${r.classeNom ?? ""}`]}
          searchPlaceholder="Rechercher une matière…"
          emptyTitle="Aucune matière"
          emptyDescription="Aucune matière ne vous est actuellement assignée. Contactez l'administrateur."
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <SubjectFormDialog
          title="Modifier la matière"
          description="Modification de l'intitulé et du coefficient (opération SOAP modifierMatiere)."
          submitLabel="Enregistrer"
          submitting={submitting}
          defaultValues={{
            intitule: editTarget.intitule,
            coefficient: editTarget.coefficient,
          }}
          onClose={() => setEditTarget(null)}
          onSubmit={onEdit}
        />
      )}

      {/* View sheet */}
      {viewTarget && (
        <Sheet open onOpenChange={(o) => !o && setViewTarget(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Détails de la matière</SheetTitle>
              <SheetDescription>
                Consultation de votre matière (service SOAP subjects).
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Intitulé" value={viewTarget.intitule} />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Coefficient</span>
                <Badge variant="secondary" className="font-mono">
                  ×{viewTarget.coefficient}
                </Badge>
              </div>
              <DetailRow
                label="Enseignant responsable"
                value={
                  viewTarget.enseignantId
                    ? `${viewTarget.enseignantNom} ${viewTarget.enseignantPrenom}`
                    : "Non assigné"
                }
              />
              <DetailRow label="Identifiant matière" value={viewTarget.id} mono />
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

interface FormDialogProps {
  title: string;
  description: string;
  submitLabel: string;
  submitting: boolean;
  defaultValues?: Partial<FormValues>;
  onClose: () => void;
  onSubmit: (v: FormValues) => Promise<void> | void;
}

function SubjectFormDialog({
  title,
  description,
  submitLabel,
  submitting,
  defaultValues,
  onClose,
  onSubmit,
}: FormDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      intitule: "",
      coefficient: 1,
      ...defaultValues,
    },
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Field label="Intitulé" error={errors.intitule?.message}>
            <Input {...register("intitule")} placeholder="ex. Algorithmique" />
          </Field>
          <Field label="Coefficient" error={errors.coefficient?.message}>
            <Input
              type="number"
              step="0.5"
              min="0.5"
              {...register("coefficient", { valueAsNumber: true })}
            />
            <p className="text-xs text-muted-foreground">
              Le coefficient doit être strictement supérieur à 0.
            </p>
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

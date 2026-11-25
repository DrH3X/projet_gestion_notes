
// src/components/admin/admin-subjects.tsx

"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  Loader2,
  BookOpen,
  Scale,
} from "lucide-react";

import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { useSectionsClasses } from "@/hooks/use-sections-classes";
import { toast } from "sonner";

import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import {
  DataTable,
  type Column,
} from "@/components/tables/data-table";

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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";

import type {
  Compte,
  Matiere,
  SoapFault,
  Section,
  Classe,
} from "@/types";

const schema = z.object({
  intitule: z.string().min(1, "Intitule requis"),
  coefficient: z
    .number()
    .refine(
      (value) => !Number.isNaN(value) && value > 0,
      { message: "Coefficient > 0 requis" }
    ),
  enseignantId: z.string().min(1, "Enseignant requis"),
});

type FormValues = z.infer<typeof schema>;

export function AdminSubjects() {
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Matiere | null>(null);
  const [viewTarget, setViewTarget] = useState<Matiere | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Matiere | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedClasseId, setSelectedClasseId] = useState("");

  // Chargement des matieres.
  const list = useAsync<Matiere[]>(
    async () => (await api.subjects.list()) as Matiere[],
    []
  );

  // Chargement des enseignants.
  const teachers = useAsync<Compte[]>(
    async () =>
      (await api.accounts.list("enseignant")) as Compte[],
    []
  );

  const { sections, classes: allClasses } = useSectionsClasses();

  // Filtrage des classes selon la section selectionnee.
  const filteredClasses = selectedSectionId
    ? allClasses.filter(
        (classe) => classe.sectionId === selectedSectionId
      )
    : allClasses;

  async function reload() {
    await list.refetch();
    await teachers.refetch();
  }

  // Statistiques.
  const stats = useMemo(() => {
    const subjects = list.data ?? [];

    return {
      total: subjects.length,
      totalCoef: subjects.reduce(
        (sum, subject) => sum + (subject.coefficient || 0),
        0
      ),
    };
  }, [list.data]);

  // Ouvrir le formulaire de creation.
  function openCreateDialog() {
    setSelectedSectionId("");
    setSelectedClasseId("");
    setCreateOpen(true);
  }

  // Creation d'une matiere.
  async function onCreate(values: FormValues) {
    if (!selectedSectionId || !selectedClasseId) {
      toast.error("Section et classe requises");
      return;
    }

    setSubmitting(true);

    try {
      await api.subjects.create({
        intitule: values.intitule,
        coefficient: values.coefficient,
        enseignantId: values.enseignantId,
        sectionId: selectedSectionId,
        classeId: selectedClasseId,
      });

      toast.success("Matiere creee");
      setCreateOpen(false);
      setSelectedSectionId("");
      setSelectedClasseId("");

      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  // Modification d'une matiere.
  async function onEdit(values: FormValues) {
    if (!editTarget) return;

    setSubmitting(true);

    try {
      await api.subjects.update({
        id: editTarget.id,
        intitule: values.intitule,
        coefficient: values.coefficient,
        enseignantId: values.enseignantId,
        ...(selectedSectionId
          ? { sectionId: selectedSectionId }
          : {}),
        ...(selectedClasseId
          ? { classeId: selectedClasseId }
          : {}),
      });

      toast.success("Matiere modifiee");
      setEditTarget(null);
      setSelectedSectionId("");
      setSelectedClasseId("");

      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Erreur");
    } finally {
      setSubmitting(false);
    }
  }

  // Suppression d'une matiere.
  async function onDelete() {
    if (!deleteTarget) return;

    try {
      await api.subjects.remove(deleteTarget.id);

      toast.success("Matiere supprimee");
      setDeleteTarget(null);

      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Erreur");
    }
  }

  // Colonnes du tableau.
  const columns: Column<Matiere>[] = [
    {
      key: "intitule",
      header: "Intitule",
      sortValue: (row) => row.intitule,
      cell: (row) => (
        <span className="font-medium">
          {row.intitule}
        </span>
      ),
    },
    {
      key: "coefficient",
      header: "Coef.",
      className: "w-[80px]",
      sortValue: (row) => row.coefficient,
      cell: (row) => (
        <Badge variant="secondary" className="font-mono">
          x{row.coefficient}
        </Badge>
      ),
    },
    {
      key: "enseignant",
      header: "Enseignant",
      sortValue: (row) =>
        `${row.enseignantNom} ${row.enseignantPrenom}`,
      cell: (row) => (
        <span>
          {row.enseignantNom} {row.enseignantPrenom}
        </span>
      ),
    },
    {
      key: "section",
      header: "Section",
      sortValue: (row) => row.sectionNom || "",
      cell: (row) =>
        row.sectionNom ? (
          <Badge variant="outline">
            {row.sectionNom}
          </Badge>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      key: "classe",
      header: "Classe",
      sortValue: (row) => row.classeNom || "",
      cell: (row) =>
        row.classeNom ? (
          <Badge variant="outline">
            {row.classeNom}
          </Badge>
        ) : (
          <span className="text-muted-foreground">--</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "w-[120px]",
      cell: (row) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setViewTarget(row)}
            title="Consulter"
            aria-label={`Consulter ${row.intitule}`}
          >
            <Eye className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => {
              setEditTarget(row);
              setSelectedSectionId(row.sectionId || "");
              setSelectedClasseId(row.classeId || "");
            }}
            title="Modifier"
            aria-label={`Modifier ${row.intitule}`}
          >
            <Pencil className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            onClick={() => setDeleteTarget(row)}
            title="Supprimer"
            aria-label={`Supprimer ${row.intitule}`}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* En-tete : meme design que la page Saisie des notes */}
      <SectionHeader
        title="Matieres"
        description="Affectez chaque matiere a un enseignant, une section et une classe."
        actions={
          <Button
            type="button"
            onClick={openCreateDialog}
          >
            <Plus className="h-4 w-4" />
            Nouvelle matiere
          </Button>
        }
      />

      {/* Statistiques */}
      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total matieres"
          value={stats.total}
          icon={BookOpen}
        />

        <StatCard
          label="Somme coefficients"
          value={stats.totalCoef}
          icon={Scale}
        />
      </div>

      {/* Tableau des matieres */}
      {list.loading ? (
        <TableSkeleton />
      ) : list.error ? (
        <ErrorState
          error={list.error}
          onRetry={() => list.refetch()}
        />
      ) : (
        <DataTable
          data={list.data ?? []}
          columns={columns}
          rowKey={(row) => row.id}
          searchKeys={[
            (row) =>
              `${row.intitule} ${row.enseignantNom} ${row.sectionNom} ${row.classeNom}`,
          ]}
          searchPlaceholder="Rechercher..."
        />
      )}

      {/* Consultation d'une matiere */}
      {viewTarget && (
        <Sheet
          open={!!viewTarget}
          onOpenChange={(open) => {
            if (!open) setViewTarget(null);
          }}
        >
          <SheetContent>
            <SheetHeader>
              <SheetTitle>{viewTarget.intitule}</SheetTitle>
              <SheetDescription>
                Coefficient : {viewTarget.coefficient}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-3">
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Enseignant
                </span>
                <span className="font-medium">
                  {viewTarget.enseignantNom}{" "}
                  {viewTarget.enseignantPrenom}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Section
                </span>
                <span className="font-medium">
                  {viewTarget.sectionNom || "--"}
                </span>
              </div>

              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">
                  Classe
                </span>
                <span className="font-medium">
                  {viewTarget.classeNom || "--"}
                </span>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Confirmation de suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Supprimer ?"
        description={`Supprimer "${deleteTarget?.intitule}" ?`}
        onConfirm={onDelete}
      />

      {/* Formulaire de creation */}
      {createOpen && (
        <SubjectFormDialog
          title="Nouvelle matiere"
          description="Renseignez tous les champs."
          submitLabel="Creer"
          submitting={submitting}
          teachers={teachers.data ?? []}
          teachersLoading={teachers.loading}
          teachersError={teachers.error}
          sections={sections}
          filteredClasses={filteredClasses}
          selectedSectionId={selectedSectionId}
          selectedClasseId={selectedClasseId}
          onSectionChange={(value) => {
            setSelectedSectionId(value);
            setSelectedClasseId("");
          }}
          onClasseChange={setSelectedClasseId}
          defaultValues={{}}
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreate}
        />
      )}

      {/* Formulaire de modification */}
      {editTarget && (
        <SubjectFormDialog
          title="Modifier la matiere"
          description="Modifiez les informations de la matiere."
          submitLabel="Enregistrer"
          submitting={submitting}
          teachers={teachers.data ?? []}
          teachersLoading={teachers.loading}
          teachersError={teachers.error}
          sections={sections}
          filteredClasses={filteredClasses}
          selectedSectionId={selectedSectionId}
          selectedClasseId={selectedClasseId}
          onSectionChange={(value) => {
            setSelectedSectionId(value);
            setSelectedClasseId("");
          }}
          onClasseChange={setSelectedClasseId}
          defaultValues={{
            intitule: editTarget.intitule,
            coefficient: editTarget.coefficient,
            enseignantId: editTarget.enseignantId,
          }}
          onClose={() => {
            setEditTarget(null);
            setSelectedSectionId("");
            setSelectedClasseId("");
          }}
          onSubmit={onEdit}
        />
      )}
    </div>
  );
}

// Champ reutilisable du formulaire.
function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

interface FormDialogProps {
  title: string;
  description: string;
  submitLabel: string;
  submitting: boolean;
  teachers: Compte[];
  teachersLoading: boolean;
  teachersError: SoapFault | null;
  sections: Section[];
  filteredClasses: Classe[];
  selectedSectionId: string;
  selectedClasseId: string;
  onSectionChange: (value: string) => void;
  onClasseChange: (value: string) => void;
  defaultValues?: Partial<FormValues>;
  onClose: () => void;
  onSubmit: (values: FormValues) => Promise<void> | void;
}

// Formulaire partage entre creation et modification.
function SubjectFormDialog({
  title,
  description,
  submitLabel,
  submitting,
  teachers,
  teachersLoading,
  teachersError,
  sections,
  filteredClasses,
  selectedSectionId,
  selectedClasseId,
  onSectionChange,
  onClasseChange,
  defaultValues,
  onClose,
  onSubmit,
}: FormDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      intitule: "",
      coefficient: 1,
      enseignantId: "",
      ...defaultValues,
    },
  });

  const enseignantId = watch("enseignantId");

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4"
        >
          <Field
            label="Intitule"
            error={errors.intitule?.message}
          >
            <Input
              {...register("intitule")}
              placeholder="Ex. Algorithmique"
            />
          </Field>

          <Field
            label="Coefficient"
            error={errors.coefficient?.message}
          >
            <Input
              type="number"
              step="0.5"
              min="0.5"
              {...register("coefficient", {
                valueAsNumber: true,
              })}
            />
          </Field>

          <Field
            label="Enseignant responsable"
            error={errors.enseignantId?.message}
          >
            {teachersError ? (
              <p className="text-xs text-destructive">
                Erreur : {teachersError.message}
              </p>
            ) : teachersLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement...
              </div>
            ) : (
              <Select
                value={enseignantId}
                onValueChange={(value) =>
                  setValue("enseignantId", value, {
                    shouldValidate: true,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner..." />
                </SelectTrigger>

                <SelectContent>
                  {teachers.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun enseignant
                    </SelectItem>
                  ) : (
                    teachers.map((teacher) => (
                      <SelectItem
                        key={teacher.id}
                        value={teacher.id}
                      >
                        {teacher.nom} {teacher.prenom} -{" "}
                        {teacher.email}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field
            label="Section"
            error={
              !selectedSectionId
                ? "Section requise"
                : undefined
            }
          >
            <Select
              value={selectedSectionId}
              onValueChange={onSectionChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner une section..." />
              </SelectTrigger>

              <SelectContent>
                {sections.map((section) => (
                  <SelectItem
                    key={section.id}
                    value={section.id}
                  >
                    {section.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            label="Classe"
            error={
              !selectedClasseId
                ? "Classe requise"
                : undefined
            }
          >
            <Select
              value={selectedClasseId}
              onValueChange={onClasseChange}
              disabled={!selectedSectionId}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    selectedSectionId
                      ? "Selectionner une classe..."
                      : "Choisir une section"
                  }
                />
              </SelectTrigger>

              <SelectContent>
                {filteredClasses.map((classe) => (
                  <SelectItem
                    key={classe.id}
                    value={classe.id}
                  >
                    {classe.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
            >
              Annuler
            </Button>

            <Button
              type="submit"
              disabled={
                submitting ||
                teachersLoading ||
                !!teachersError ||
                teachers.length === 0 ||
                !selectedSectionId ||
                !selectedClasseId
              }
            >
              {submitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

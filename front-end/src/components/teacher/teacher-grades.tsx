"use client";

import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  ClipboardList,
  RefreshCw,
} from "lucide-react";
import { api } from "@/lib/api-client";
import { useSectionsClasses } from "@/hooks/use-sections-classes";
import { useAsync } from "@/hooks/use-async";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
import { StatCard } from "@/components/shared/stat-card";
import { TableSkeleton, CardGridSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { DataTable, type Column } from "@/components/tables/data-table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { TypeNoteBadge, NoteValue } from "@/components/shared/badges";
import type { Dossier, Matiere, Note, SoapFault, TypeNote } from "@/types";

const TYPE_OPTIONS: { value: TypeNote; label: string }[] = [
  { value: "DS", label: "DS" },
  { value: "examen", label: "Examen" },
  { value: "TP", label: "TP" },
];

const createSchema = z.object({
  etudiantId: z.string().min(1, "Étudiant requis"),
  matiereId: z.string().min(1, "Matière requise"),
  type: z.enum(["DS", "examen", "TP"]),
  valeur: z
    .number()
    .refine((v) => !Number.isNaN(v) && v >= 0 && v <= 20, {
      message: "La note doit être comprise entre 0 et 20",
    }),
});

type CreateValues = z.infer<typeof createSchema>;

const editSchema = z.object({
  type: z.enum(["DS", "examen", "TP"]),
  valeur: z
    .number()
    .refine((v) => !Number.isNaN(v) && v >= 0 && v <= 20, {
      message: "La note doit être comprise entre 0 et 20",
    }),
});

type EditValues = z.infer<typeof editSchema>;

export function TeacherGrades() {
  const [filterMatiere, setFilterMatiere] = useState("");
  const [filterEtudiant, setFilterEtudiant] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Note | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Note | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Subjects the teacher owns (for both the filter dropdown and the create dialog).
  const subjects = useAsync<Matiere[]>(() => api.subjects.myList(), []);
  // Students the teacher can grade (for the filter dropdown + create dialog).
  const students = useAsync<Dossier[]>(() => api.students.teacherList(), []);
  // Notes belonging to the teacher, optionally filtered.
  const notes = useAsync<Note[]>(
    () =>
      api.notes.teacherList(
        filterMatiere || undefined,
        filterEtudiant || undefined,
      ),
    [filterMatiere, filterEtudiant],
  );

  async function reload() {
    await Promise.all([subjects.refetch(), students.refetch(), notes.refetch()]);
  }

  async function reloadNotes() {
    await notes.refetch();
  }

  const summary = useMemo(() => {
    const arr = notes.data ?? [];
    if (arr.length === 0) return { count: 0, moyenne: null };
    const sum = arr.reduce((s, n) => s + (n.valeur || 0), 0);
    return { count: arr.length, moyenne: sum / arr.length };
  }, [notes.data]);

  const loading = subjects.loading || students.loading || notes.loading;
  const firstError = subjects.error ?? students.error ?? notes.error;

  async function onCreate(values: CreateValues) {
    setSubmitting(true);
    try {
      await api.notes.create({
        etudiantId: values.etudiantId,
        matiereId: values.matiereId,
        valeur: values.valeur,
        type: values.type,
      });
      toast.success("Note saisie avec succès");
      setCreateOpen(false);
      await reloadNotes();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la saisie");
    } finally {
      setSubmitting(false);
    }
  }

  async function onEdit(values: EditValues) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      await api.notes.update({
        id: editTarget.id,
        valeur: values.valeur,
        type: values.type,
      });
      toast.success("Note modifiée");
      setEditTarget(null);
      await reloadNotes();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la modification");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await api.notes.remove(deleteTarget.id);
      toast.success("Note supprimée");
      setDeleteTarget(null);
      await reloadNotes();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la suppression");
      setDeleteTarget(null);
    }
  }

  const columns: Column<Note>[] = [
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
      key: "matiere",
      header: "Matière",
      sortValue: (r) => r.matiereIntitule,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.matiereIntitule}</p>
          <p className="text-xs text-muted-foreground font-mono">{r.matiereId}</p>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      className: "w-[100px]",
      cell: (r) => <TypeNoteBadge type={r.type} />,
      sortValue: (r) => r.type,
    },
    {
      key: "valeur",
      header: "Note",
      className: "w-[110px] text-right",
      sortValue: (r) => r.valeur,
      cell: (r) => (
        <div className="text-right">
          <span className="text-lg">
            <NoteValue value={r.valeur} />
          </span>
          <span className="text-xs text-muted-foreground"> / 20</span>
        </div>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "w-[100px]",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setEditTarget(r)}
            title="Modifier"
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(r)}
            title="Supprimer"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Saisie des notes"
        description="Saisissez, modifiez ou supprimez les notes de vos étudiants."
        actions={
          <Button onClick={() => setCreateOpen(true)} disabled={loading && !subjects.data}>
            <Plus className="h-4 w-4" />
            Nouvelle note
          </Button>
        }
      />

      {/* Filter bar */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Matière</label>
          <Select
            value={filterMatiere || "all"}
            onValueChange={(v) => setFilterMatiere(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Toutes mes matières" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes mes matières</SelectItem>
              {(subjects.data ?? []).map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.intitule}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs text-muted-foreground">Étudiant</label>
          <Select
            value={filterEtudiant || "all"}
            onValueChange={(v) => setFilterEtudiant(v === "all" ? "" : v)}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder="Tous mes étudiants" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous mes étudiants</SelectItem>
              {(students.data ?? []).map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nom} {s.prenom} {s.matricule ? `(${s.matricule})` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary */}
      {loading ? (
        <CardGridSkeleton count={2} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <StatCard
            label="Notes affichées"
            value={summary.count}
            hint={summary.count === 0 ? "Aucune note" : "note(s) filtrée(s)"}
            icon={ClipboardList}
            accent="default"
          />
          <StatCard
            label="Moyenne des notes affichées"
            value={summary.moyenne !== null ? summary.moyenne.toFixed(2) : "—"}
            hint={summary.moyenne !== null ? "/ 20" : "Aucune note"}
            icon={ClipboardList}
            accent={
              summary.moyenne === null
                ? "default"
                : summary.moyenne >= 10
                ? "success"
                : "danger"
            }
          />
          <StatCard
            label="Matières couvertes"
            value={new Set((notes.data ?? []).map((n) => n.matiereId)).size}
            hint="matière(s) distincte(s)"
            icon={ClipboardList}
            accent="info"
          />
        </div>
      )}

      {/* Notes table */}
      {loading ? (
        <TableSkeleton rows={6} cols={5} />
      ) : firstError ? (
        <ErrorState error={firstError} onRetry={reload} />
      ) : (
        <DataTable
          data={notes.data ?? []}
          columns={columns}
          rowKey={(r) => r.id}
          searchKeys={[
            (r) => `${r.etudiantNom} ${r.etudiantPrenom} ${r.matiereIntitule}`,
          ]}
          searchPlaceholder="Rechercher par étudiant, matière…"
          emptyTitle="Aucune note"
          emptyDescription="Aucune note ne correspond aux filtres sélectionnés."
        />
      )}

      {/* Create dialog */}
      {createOpen && (
        <NoteCreateDialog
          subjects={subjects.data ?? []}
          students={students.data ?? []}
          subjectsLoading={subjects.loading}
          studentsLoading={students.loading}
          subjectsError={subjects.error}
          studentsError={students.error}
          onReloadStudents={students.refetch}
          submitting={submitting}
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreate}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <NoteEditDialog
          note={editTarget}
          submitting={submitting}
          onClose={() => setEditTarget(null)}
          onSubmit={onEdit}
        />
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer la note ?"
        description={
          `Cette action supprimera la note de ${deleteTarget?.etudiantNom} ${deleteTarget?.etudiantPrenom} ` +
          `en ${deleteTarget?.matiereIntitule} (${deleteTarget?.type}). ` +
          `Cette opération est irréversible.`
        }
        confirmLabel="Supprimer"
        destructive
        onConfirm={onDelete}
      />
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

interface NoteCreateDialogProps {
  subjects: Matiere[];
  students: Dossier[];
  subjectsLoading: boolean;
  studentsLoading: boolean;
  subjectsError: SoapFault | null;
  studentsError: SoapFault | null;
  onReloadStudents: () => Promise<void>;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: CreateValues) => Promise<void> | void;
}

function NoteCreateDialog({
  subjects,
  students,
  subjectsLoading,
  studentsLoading,
  subjectsError,
  studentsError,
  onReloadStudents,
  submitting,
  onClose,
  onSubmit,
}: NoteCreateDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      etudiantId: "",
      matiereId: "",
      type: "DS",
      valeur: 10,
    },
  });

  const etudiantId = watch("etudiantId");
  const matiereId = watch("matiereId");
  const type = watch("type");
  const { sections, classes, loading: sectionsClassesLoading } = useSectionsClasses();
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedClasseId, setSelectedClasseId] = useState("");
  const filteredClasses = selectedSectionId
    ? classes.filter((classe) => classe.sectionId === selectedSectionId)
    : classes;
  const filteredStudents = students.filter((student) => {
    if (selectedSectionId && student.sectionId !== selectedSectionId) return false;
    if (selectedClasseId && student.classeId !== selectedClasseId) return false;
    return true;
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouvelle note</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Section">
              <Select
                value={selectedSectionId || "all"}
                onValueChange={(value) => {
                  setSelectedSectionId(value === "all" ? "" : value);
                  setSelectedClasseId("");
                  setValue("etudiantId", "");
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les sections</SelectItem>
                  {sections.map((section) => (
                    <SelectItem key={section.id} value={section.id}>{section.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Classe">
              <Select
                value={selectedClasseId || "all"}
                onValueChange={(value) => {
                  setSelectedClasseId(value === "all" ? "" : value);
                  setValue("etudiantId", "");
                }}
                disabled={sectionsClassesLoading || filteredClasses.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Toutes les classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Toutes les classes</SelectItem>
                  {filteredClasses.map((classe) => (
                    <SelectItem key={classe.id} value={classe.id}>{classe.nom}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onReloadStudents}
              disabled={studentsLoading}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${studentsLoading ? "animate-spin" : ""}`} />
              Recharger les étudiants
            </Button>
          </div>
          <Field label="Étudiant" error={errors.etudiantId?.message}>
            {studentsError ? (
              <p className="text-xs text-destructive">
                Impossible de charger les étudiants : {studentsError.message}
              </p>
            ) : studentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des étudiants…
              </div>
            ) : (
              <Select
                value={etudiantId}
                onValueChange={(v) => setValue("etudiantId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner un étudiant…" />
                </SelectTrigger>
                <SelectContent>
                  {filteredStudents.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucun étudiant pour cette section/classe
                    </SelectItem>
                  ) : (
                    filteredStudents.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.nom} {s.prenom}
                        {s.classe ? ` — ${s.classe}` : ""}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </Field>

          <Field label="Matière" error={errors.matiereId?.message}>
            {subjectsError ? (
              <p className="text-xs text-destructive">
                Impossible de charger vos matières : {subjectsError.message}
              </p>
            ) : subjectsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Chargement des matières…
              </div>
            ) : (
              <Select
                value={matiereId}
                onValueChange={(v) => setValue("matiereId", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner une matière…" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.length === 0 ? (
                    <SelectItem value="none" disabled>
                      Aucune matière disponible
                    </SelectItem>
                  ) : (
                    subjects.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.intitule} (×{m.coefficient})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de note" error={errors.type?.message}>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue("type", v as CreateValues["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type…" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Note / 20" error={errors.valeur?.message}>
              <Input
                type="number"
                step="0.25"
                min="0"
                max="20"
                {...register("valeur", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={
                submitting ||
                subjectsLoading ||
                studentsLoading
              }
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer la note
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

interface NoteEditDialogProps {
  note: Note;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: EditValues) => Promise<void> | void;
}

function NoteEditDialog({
  note,
  submitting,
  onClose,
  onSubmit,
}: NoteEditDialogProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      type: note.type,
      valeur: note.valeur,
    },
  });

  const type = watch("type");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier la note</DialogTitle>
          <DialogDescription>
            Modification de la note de {note.etudiantNom} {note.etudiantPrenom} en{" "}
            {note.matiereIntitule} (opération SOAP modifierNote).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground space-y-1">
            <p>
              <span className="text-muted-foreground">Étudiant :</span>{" "}
              <span className="font-medium text-foreground">
                {note.etudiantNom} {note.etudiantPrenom}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Matière :</span>{" "}
              <span className="font-medium text-foreground">
                {note.matiereIntitule} (×{note.coefficient})
              </span>
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Type de note" error={errors.type?.message}>
              <Select
                value={type}
                onValueChange={(v) =>
                  setValue("type", v as EditValues["type"])
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Type…" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Note / 20" error={errors.valeur?.message}>
              <Input
                type="number"
                step="0.25"
                min="0"
                max="20"
                {...register("valeur", { valueAsNumber: true })}
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

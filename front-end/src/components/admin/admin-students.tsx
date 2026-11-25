"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Plus, Pencil, Trash2, Eye, Loader2 } from "lucide-react";
import { api } from "@/lib/api-client";
import { useAsync } from "@/hooks/use-async";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
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
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import type { Dossier, SoapFault } from "@/types";

const schema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  motDePasse: z.string().min(6, "Min. 6 caractères"),
  classe: z.string().min(1, "Classe requise"),
  
  matricule: z.string().optional(),
  dateNaissance: z.string().optional(),
  adresse: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

const CLASSES = ["1A", "2A", "3A", "4A", "5A", "L1", "L2", "L3", "M1", "M2"];

export function AdminStudents() {
  const [filterClasse, setFilterClasse] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Dossier | null>(null);
  const [viewTarget, setViewTarget] = useState<Dossier | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Dossier | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const list = useAsync<Dossier[]>(
    () => api.students.list(filterClasse),
    [filterClasse]
  );

  async function reload() {
    await list.refetch();
  }

  async function onCreate(values: FormValues) {
    setSubmitting(true);
    try {
      // creerCompte with role=etudiant creates the account AND the academic dossier;
      // the backend auto-generates the matricule (ETU-<8 hex>), it is never sent.
      await api.accounts.create({
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        motDePasse: values.motDePasse,
        role: "etudiant",
        classe: values.classe,
        dateNaissance: values.dateNaissance || undefined,
        adresse: values.adresse || undefined,
      });
      toast.success("Étudiant créé avec succès");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la création");
    } finally {
      setSubmitting(false);
    }
  }

  async function onEdit(values: FormValues) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      // modifierDossier: the matricule is not sent (left unchanged — it is an
      // auto-generated identifier and should not be edited.
      await api.students.update({
        id: editTarget.id,
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        classe: values.classe,
        dateNaissance: values.dateNaissance || "",
        adresse: values.adresse || "",
      });
      toast.success("Étudiant modifié");
      setEditTarget(null);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la modification");
    } finally {
      setSubmitting(false);
    }
  }

  async function onDelete() {
    if (!deleteTarget) return;
    try {
      await api.students.remove(deleteTarget.id);
      toast.success("Étudiant supprimé");
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la suppression");
      setDeleteTarget(null);
    }
  }

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
    { key: "matricule", header: "Matricule", cell: (r) => <span className="font-mono text-xs">{r.matricule}</span>, sortValue: (r) => r.matricule },
    {
      key: "classe",
      header: "Classe",
      cell: (r) => <Badge variant="secondary">{r.classe || "—"}</Badge>,
      sortValue: (r) => r.classe,
    },
    { key: "naissance", header: "Naissance", cell: (r) => <span className="text-xs text-muted-foreground">{r.dateNaissance || "—"}</span> },
    {
      key: "actions",
      header: "",
      className: "text-right",
      headerClassName: "w-[120px]",
      cell: (r) => (
        <div className="flex items-center justify-end gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewTarget(r)} title="Consulter">
            <Eye className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTarget(r)} title="Modifier">
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => setDeleteTarget(r)} title="Supprimer">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Étudiants"
        description="Gérez les dossiers étudiants : création, modification, consultation et suppression."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouvel étudiant
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Classe :</span>
        <Select value={filterClasse} onValueChange={(v) => setFilterClasse(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-9">
            <SelectValue placeholder="Toutes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les classes</SelectItem>
            {CLASSES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {list.loading ? (
        <TableSkeleton rows={6} cols={5} />
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
          emptyDescription="Aucun dossier étudiant ne correspond à votre recherche."
        />
      )}

      {/* Create dialog */}
      {createOpen && (
        <StudentFormDialog
          title="Nouvel étudiant"
          submitLabel="Créer l'étudiant"
          submitting={submitting}
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreate}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <StudentFormDialog
          title="Modifier l'étudiant"
          description="Modification du dossier (opérations SOAP modifierDossier)."
          submitLabel="Enregistrer"
          submitting={submitting}
          defaultValues={{
            nom: editTarget.nom,
            prenom: editTarget.prenom,
            email: editTarget.email,
            motDePasse: "",
            classe: editTarget.classe,
            matricule: editTarget.matricule,
            dateNaissance: editTarget.dateNaissance,
            adresse: editTarget.adresse,
          }}
          editMode
          onClose={() => setEditTarget(null)}
          onSubmit={onEdit}
        />
      )}

      {/* View sheet */}
      {viewTarget && (
        <Sheet open onOpenChange={(o) => !o && setViewTarget(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Dossier étudiant</SheetTitle>
              <SheetDescription>Consultation (opération SOAP consulterDossier).</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Nom" value={`${viewTarget.nom} ${viewTarget.prenom}`} />
              <DetailRow label="Email" value={viewTarget.email} />
              <DetailRow label="Matricule" value={viewTarget.matricule} mono />
              <DetailRow label="Classe" value={viewTarget.classe || "—"} />
              <DetailRow label="Date de naissance" value={viewTarget.dateNaissance || "—"} />
              <DetailRow label="Adresse" value={viewTarget.adresse || "—"} />
              <DetailRow label="Identifiant dossier" value={viewTarget.id} mono />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer l'étudiant ?"
        description={`Cette action supprimera le dossier de ${deleteTarget?.nom} ${deleteTarget?.prenom} et son compte associé. Cette opération est irréversible.`}
        confirmLabel="Supprimer"
        destructive
        onConfirm={onDelete}
      />
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-xs" : "font-medium text-right"}>{value}</span>
    </div>
  );
}

interface FormDialogProps {
  title: string;
  description?: string;
  submitLabel: string;
  submitting: boolean;
  defaultValues?: Partial<FormValues>;
  editMode?: boolean;
  onClose: () => void;
  onSubmit: (v: FormValues) => Promise<void> | void;
}

function StudentFormDialog({
  title,
  description,
  submitLabel,
  submitting,
  defaultValues,
  editMode,
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
      nom: "",
      prenom: "",
      email: "",
      motDePasse: "",
      classe: "",
      matricule: "",
      dateNaissance: "",
      adresse: "",
      ...defaultValues,
    },
  });

  const classe = watch("classe");

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom" error={errors.nom?.message}>
              <Input {...register("nom")} />
            </Field>
            <Field label="Prénom" error={errors.prenom?.message}>
              <Input {...register("prenom")} />
            </Field>
          </div>
          <Field label="Email" error={errors.email?.message}>
            <Input type="email" {...register("email")} />
          </Field>
          <Field
            label={editMode ? "Nouveau mot de passe (laisser vide pour ne pas changer)" : "Mot de passe"}
            error={errors.motDePasse?.message}
          >
            <Input type="password" {...register("motDePasse")} disabled={editMode} placeholder={editMode ? "Inchangé" : "••••••"} />
          </Field>
          <div className={editMode ? "grid grid-cols-2 gap-3" : "grid gap-3"}>
            {editMode && (
              <Field label="Matricule (auto-généré)">
                <Input value={defaultValues?.matricule ?? ""} disabled readOnly />
              </Field>
            )}
            <Field label="Classe" error={errors.classe?.message}>
              <Select value={classe} onValueChange={(v) => setValue("classe", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sélectionner…" />
                </SelectTrigger>
                <SelectContent>
                  {CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date de naissance (optionnelle)">
              <Input type="date" {...register("dateNaissance")} />
            </Field>
            <Field label="Adresse (optionnelle)">
              <Input {...register("adresse")} />
            </Field>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}


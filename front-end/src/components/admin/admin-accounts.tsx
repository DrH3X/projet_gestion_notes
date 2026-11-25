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
import { RoleBadge } from "@/components/shared/badges";
import type { Compte, Role, SoapFault, Section, Classe } from "@/types";
import { useSectionsClasses } from "@/hooks/use-sections-classes";


const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: "administrateur", label: "Administrateur" },
  { value: "enseignant", label: "Enseignant" },
  { value: "etudiant", label: "Étudiant" },
];

// --- Create schema ---
const createSchema = z
  .object({
    nom: z.string().min(1, "Nom requis"),
    prenom: z.string().min(1, "Prénom requis"),
    email: z.string().email("Email invalide"),
    motDePasse: z.string().min(6, "Min. 6 caractères"),
    role: z.enum(["administrateur", "enseignant", "etudiant"]),
    classe: z.string().optional(),
    dateNaissance: z.string().optional(),
    adresse: z.string().optional(),
  })
;  // Section/classe are handled via separate dropdowns, not the form schema

type CreateValues = z.infer<typeof createSchema>;

// --- Edit schema ---
const editSchema = z.object({
  nom: z.string().min(1, "Nom requis"),
  prenom: z.string().min(1, "Prénom requis"),
  email: z.string().email("Email invalide"),
  classe: z.string().optional(),
  motDePasse: z.string().optional(),
});

type EditValues = z.infer<typeof editSchema>;

export function AdminAccounts() {
  const [filterRole, setFilterRole] = useState<string>("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Compte | null>(null);
  const [viewTarget, setViewTarget] = useState<Compte | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Compte | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const list = useAsync<Compte[]>(() => api.accounts.list(filterRole), [filterRole]);

  async function reload() {
    await list.refetch();
  }

  async function onCreate(values: CreateValues) {
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        motDePasse: values.motDePasse,
        role: values.role,
      };
      if (values.role === "etudiant") {
        if (values.dateNaissance) body.dateNaissance = values.dateNaissance;
        if (values.adresse?.trim()) body.adresse = values.adresse.trim();
      }
      if (values.role === "etudiant" || values.role === "enseignant") {
        if (values.classe) body.classe = values.classe;
        if ((values as any).sectionId) body.sectionId = (values as any).sectionId;
        if ((values as any).classeId) body.classeId = (values as any).classeId;
      }
      await api.accounts.create(body);

      // La création d'un enseignant ne crée pas automatiquement ses lignes
      // d'affectation : les enregistrer explicitement pour l'interface Sections & Classes.
      if (values.role === "enseignant") {
        const sectionId = (values as any).sectionId as string | undefined;
        const classeId = (values as any).classeId as string | undefined;
        if (sectionId || classeId) {
          const createdTeachers = await api.accounts.list("enseignant") as Compte[];
          const createdTeacher = (Array.isArray(createdTeachers) ? createdTeachers : [])
            .find((teacher) => teacher.email.toLowerCase() === values.email.toLowerCase());

          if (createdTeacher) {
            const assignments = [];
            if (sectionId) assignments.push(api.sections.assignTeacherSections(createdTeacher.id, [sectionId]));
            if (classeId) assignments.push(api.sections.assignTeacherClasses(createdTeacher.id, [classeId]));
            await Promise.all(assignments);
          } else {
            throw new Error("Compte enseignant créé, mais impossible de retrouver son identifiant pour enregistrer ses affectations.");
          }
        }
      }

      toast.success("Compte créé avec succès");
      setCreateOpen(false);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la création");
    } finally {
      setSubmitting(false);
    }
  }

  async function onEdit(values: EditValues) {
    if (!editTarget) return;
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        id: editTarget.id,
        nom: values.nom,
        prenom: values.prenom,
        email: values.email,
        classe: values.classe ?? "",
      };
      if (values.motDePasse && values.motDePasse.length > 0) {
        body.motDePasse = values.motDePasse;
      }
      if ((values as any).sectionId) body.sectionId = (values as any).sectionId;
      if ((values as any).classeId) body.classeId = (values as any).classeId;
      await api.accounts.update(body);
      toast.success("Compte modifié");
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
      await api.accounts.remove(deleteTarget.id);
      toast.success("Compte supprimé");
      setDeleteTarget(null);
      await reload();
    } catch (err) {
      toast.error((err as SoapFault).message || "Échec de la suppression");
      setDeleteTarget(null);
    }
  }

  const columns: Column<Compte>[] = [
    {
      key: "name",
      header: "Compte",
      sortValue: (r) => r.nom,
      cell: (r) => (
        <div>
          <p className="font-medium">{r.nom} {r.prenom}</p>
          <p className="text-xs text-muted-foreground">{r.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Rôle",
      cell: (r) => <RoleBadge role={r.role} />,
      sortValue: (r) => r.role,
    },
    {
      key: "classe",
      header: "Classe",
      cell: (r) =>
        r.classe ? <Badge variant="secondary">{r.classe}</Badge> : <span className="text-muted-foreground">—</span>,
      sortValue: (r) => r.classe,
    },
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
        title="Comptes & Enseignants"
        description="Gérez les comptes : création, modification, suppression, filtrage par rôle."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nouveau compte
          </Button>
        }
      />

      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Rôle :</span>
        <Select value={filterRole || "all"} onValueChange={(v) => setFilterRole(v === "all" ? "" : v)}>
          <SelectTrigger className="w-44 h-9">
            <SelectValue placeholder="Tous" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les rôles</SelectItem>
            {ROLE_OPTIONS.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
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
          searchKeys={[(r) => `${r.nom} ${r.prenom} ${r.email} ${r.classe}`]}
          searchPlaceholder="Rechercher par nom, email, classe…"
          emptyTitle="Aucun compte"
          emptyDescription="Aucun compte ne correspond à ce filtre."
        />
      )}

      {/* Create dialog */}
      {createOpen && (
        <CreateAccountDialog
          submitting={submitting}
          onClose={() => setCreateOpen(false)}
          onSubmit={onCreate}
        />
      )}

      {/* Edit dialog */}
      {editTarget && (
        <EditAccountDialog
          target={editTarget}
          submitting={submitting}
          onClose={() => setEditTarget(null)}
          onSubmit={onEdit}
        />
      )}

      {/* View sheet */}
      {viewTarget && (
        <Sheet open onOpenChange={(o) => !o && setViewTarget(null)}>
          <SheetContent className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Détails du compte</SheetTitle>
              <SheetDescription>Consultation du compte (service SOAP accounts).</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Nom" value={`${viewTarget.nom} ${viewTarget.prenom}`} />
              <DetailRow label="Email" value={viewTarget.email} />
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground">Rôle</span>
                <RoleBadge role={viewTarget.role} />
              </div>
              <DetailRow label="Classe" value={viewTarget.classe || "—"} />
              <DetailRow label="Identifiant" value={viewTarget.id} mono />
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(o) => !o && setDeleteTarget(null)}
        title="Supprimer le compte ?"
        description={`Cette action supprimera le compte de ${deleteTarget?.nom} ${deleteTarget?.prenom}. Cette opération est irréversible.`}
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

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

function CreateAccountDialog({
  submitting,
  onClose,
  onSubmit,
}: {
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: CreateValues) => Promise<void> | void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      nom: "",
      prenom: "",
      email: "",
      motDePasse: "",
      role: "etudiant",
      classe: "",
      dateNaissance: "",
      adresse: "",
    },
  });

  const role = watch("role");
  const classe = watch("classe");

  // Dynamic sections & classes from the backend
  const { sections, classes: allClasses } = useSectionsClasses();
  const [selectedSectionId, setSelectedSectionId] = useState("");
  const [selectedClasseId, setSelectedClasseId] = useState("");
  const filteredClasses = selectedSectionId
    ? allClasses.filter((c) => c.sectionId === selectedSectionId)
    : allClasses;

  function onClasseSelect(classeId: string) {
    setSelectedClasseId(classeId);
    const c = allClasses.find((x) => x.id === classeId);
    if (c) setValue("classe", c.nom);
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nouveau compte</DialogTitle>
          <DialogDescription>
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((vals) => {
              const enhanced: any = { ...vals };

if (selectedSectionId) {
  enhanced.sectionId = selectedSectionId;
}

if (selectedClasseId) {
  enhanced.classeId = selectedClasseId;

  const c = allClasses.find((x) => x.id === selectedClasseId);

  if (c) {
    enhanced.classe = c.nom;
  }
}

return onSubmit(enhanced as CreateValues);
              return onSubmit(enhanced as EditValues);
            })} className="space-y-4">
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
          <Field label="Mot de passe" error={errors.motDePasse?.message}>
            <Input type="password" {...register("motDePasse")} placeholder="••••••" />
          </Field>
          <Field label="Rôle" error={errors.role?.message}>
            <Select value={role} onValueChange={(v) => setValue("role", v as Role)}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner…" />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          {role === "etudiant" && (
            <>
              <Field label="Date de naissance (optionnelle)">
                <Input type="date" {...register("dateNaissance")} />
              </Field>
              <Field label="Adresse (optionnelle)">
                <Input {...register("adresse")} placeholder="Adresse de l'étudiant" />
              </Field>
            </>
          )}
          {(role === "etudiant" || role === "enseignant") && (
            <>
              <Field label="Section" error={!selectedSectionId ? "Section requise" : undefined}>
                <Select value={selectedSectionId} onValueChange={(v) => { setSelectedSectionId(v); setSelectedClasseId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une section…" />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Classe" error={!selectedClasseId ? "Classe requise" : undefined}>
                <Select value={selectedClasseId} onValueChange={(v) => onClasseSelect(v)} disabled={!selectedSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSectionId ? "Sélectionner une classe…" : "Choisir d'abord une section"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer le compte
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function EditAccountDialog({
  target,
  submitting,
  onClose,
  onSubmit,
}: {
  target: Compte;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (v: EditValues) => Promise<void> | void;
}) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<EditValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      nom: target.nom,
      prenom: target.prenom,
      email: target.email,
      classe: target.classe,
      motDePasse: "",
    },
  });

  const classe = watch("classe");

  // Dynamic sections & classes for the edit dialog (own state)
  const { sections: editSections, classes: editAllClasses } = useSectionsClasses();
  const [editSectionId, setEditSectionId] = useState("");
  const [editClasseId, setEditClasseId] = useState("");
  const editFilteredClasses = editSectionId ? editAllClasses.filter((c) => c.sectionId === editSectionId) : editAllClasses;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Modifier le compte</DialogTitle>
          <DialogDescription>
            Modification du compte (opération SOAP modifierCompte). Le rôle n'est pas modifiable.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit((vals) => {
              const enhanced: any = { ...vals };
              if (editSectionId) enhanced.sectionId = editSectionId;
              if (editClasseId) {
                enhanced.classeId = editClasseId;
                const c = editAllClasses.find((x) => x.id === editClasseId);
                if (c) enhanced.classe = c.nom;
              }
              return onSubmit(enhanced as EditValues);
            })} className="space-y-4">
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
          <Field label="Rôle" error="">
            <Input value={ROLE_LABEL(target.role)} disabled />
            <p className="text-xs text-muted-foreground">Le rôle ne peut pas être modifié après création.</p>
          </Field>
          {(target.role === "etudiant" || target.role === "enseignant") ? (
            <>
              <Field label="Section">
                <Select value={editSectionId} onValueChange={(v) => { setEditSectionId(v); setEditClasseId(""); }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selectionner une section..." />
                  </SelectTrigger>
                  <SelectContent>
                    {editSections.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Classe">
                <Select value={editClasseId} onValueChange={(v) => {
                  setEditClasseId(v);
                  const c = editAllClasses.find((x) => x.id === v);
                  if (c) setValue("classe", c.nom);
                }} disabled={!editSectionId}>
                  <SelectTrigger>
                    <SelectValue placeholder={editSectionId ? "Selectionner une classe..." : "Choisir une section"} />
                  </SelectTrigger>
                  <SelectContent>
                    {editFilteredClasses.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </>
          ) : null}
          <Field label="Nouveau mot de passe (laisser vide pour ne pas changer)" error={errors.motDePasse?.message}>
            <Input type="password" {...register("motDePasse")} placeholder="Inchangé" />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Annuler</Button>
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

function ROLE_LABEL(role: Role): string {
  return ROLE_OPTIONS.find((r) => r.value === role)?.label ?? role;
}

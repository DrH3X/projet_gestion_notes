"use client";
import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Layers, Loader2, BookOpen, ChevronRight } from "lucide-react";
import { api } from "@/lib/api-client";
import { useSectionsClasses } from "@/hooks/use-sections-classes";
import { toast } from "sonner";
import { SectionHeader } from "@/components/shared/section-header";
import { TableSkeleton } from "@/components/shared/loading";
import { ErrorState } from "@/components/shared/error-state";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Section, Classe, SoapFault } from "@/types";

export function AdminSections() {
  const [tab, setTab] = useState<"sections" | "classes">("sections");
  const { sections, classes, loading: loadingSC, refresh } = useSectionsClasses();

  const [showSectionDialog, setShowSectionDialog] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [sectionForm, setSectionForm] = useState({ nom: "", description: "" });
  const [savingSection, setSavingSection] = useState(false);
  const [deleteSection, setDeleteSection] = useState<Section | null>(null);

  const [showClasseDialog, setShowClasseDialog] = useState(false);
  const [editingClasse, setEditingClasse] = useState<Classe | null>(null);
  const [classeForm, setClasseForm] = useState({ nom: "", sectionId: "" });
  const [savingClasse, setSavingClasse] = useState(false);
  const [deleteClasse, setDeleteClasse] = useState<Classe | null>(null);
  const [filterSectionId, setFilterSectionId] = useState<string>("all");

  function openCreateSection() { setEditingSection(null); setSectionForm({ nom: "", description: "" }); setShowSectionDialog(true); }
  function openEditSection(s: Section) { setEditingSection(s); setSectionForm({ nom: s.nom, description: s.description || "" }); setShowSectionDialog(true); }

  async function saveSection() {
    if (!sectionForm.nom.trim()) { toast.error("Le nom est requis"); return; }
    setSavingSection(true);
    try {
      if (editingSection) {
        await api.sections.update({ id: editingSection.id, nom: sectionForm.nom.trim(), description: sectionForm.description.trim() });
        toast.success("Section modifiee");
      } else {
        await api.sections.create({ nom: sectionForm.nom.trim(), description: sectionForm.description.trim() });
        toast.success("Section creee");
      }
      setShowSectionDialog(false); refresh();
    } catch (e) { toast.error((e as SoapFault).message || "Erreur"); }
    finally { setSavingSection(false); }
  }

  async function confirmDeleteSection() {
    if (!deleteSection) return;
    try { await api.sections.remove(deleteSection.id); toast.success("Section supprimee"); }
    catch (e) { toast.error((e as SoapFault).message || "Erreur"); }
    finally { setDeleteSection(null); refresh(); }
  }

  function openCreateClasse(sectionId?: string) { setEditingClasse(null); setClasseForm({ nom: "", sectionId: sectionId || sections[0]?.id || "" }); setShowClasseDialog(true); }
  function openEditClasse(c: Classe) { setEditingClasse(c); setClasseForm({ nom: c.nom, sectionId: c.sectionId }); setShowClasseDialog(true); }

  async function saveClasse() {
    if (!classeForm.nom.trim()) { toast.error("Le nom est requis"); return; }
    if (!classeForm.sectionId) { toast.error("Section requise"); return; }
    setSavingClasse(true);
    try {
      if (editingClasse) {
        await api.sections.updateClasse({ id: editingClasse.id, nom: classeForm.nom.trim(), sectionId: classeForm.sectionId });
        toast.success("Classe modifiee");
      } else {
        await api.sections.createClasse({ nom: classeForm.nom.trim(), sectionId: classeForm.sectionId });
        toast.success("Classe creee");
      }
      setShowClasseDialog(false); refresh();
    } catch (e) { toast.error((e as SoapFault).message || "Erreur"); }
    finally { setSavingClasse(false); }
  }

  async function confirmDeleteClasse() {
    if (!deleteClasse) return;
    try { await api.sections.removeClasse(deleteClasse.id); toast.success("Classe supprimee"); }
    catch (e) { toast.error((e as SoapFault).message || "Erreur"); }
    finally { setDeleteClasse(null); refresh(); }
  }

  const filteredClasses = filterSectionId === "all" ? classes : classes.filter(c => c.sectionId === filterSectionId);
  const classesBySection = sections.reduce<Record<string, number>>((acc, s) => { acc[s.id] = classes.filter(c => c.sectionId === s.id).length; return acc; }, {});

  return (
    <div className="space-y-6">
      <SectionHeader title="Sections & Classes" subtitle="Gerez les sections (filieres) et leurs classes" icon={Layers}
        action={<div className="flex gap-2">
          <Button variant={tab === "sections" ? "default" : "outline"} size="sm" onClick={() => setTab("sections")}><Layers className="size-4 mr-1" />Sections</Button>
          <Button variant={tab === "classes" ? "default" : "outline"} size="sm" onClick={() => setTab("classes")}><BookOpen className="size-4 mr-1" />Classes</Button>
        </div>}
      />

      {tab === "sections" ? (
        <>
          <div className="flex justify-end"><Button size="sm" onClick={openCreateSection}><Plus className="size-4 mr-1" />Creer une section</Button></div>
          {loadingSC ? <TableSkeleton /> : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sections.map(s => (
                <Card key={s.id}>
                  <CardHeader className="pb-3"><div className="flex items-start justify-between">
                    <div><CardTitle className="text-lg">{s.nom}</CardTitle>{s.description && <p className="text-sm text-muted-foreground mt-1">{s.description}</p>}</div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditSection(s)}><Pencil className="size-4" /></Button>
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => setDeleteSection(s)}><Trash2 className="size-4 text-destructive" /></Button>
                    </div>
                  </div></CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{classesBySection[s.id] || 0} classe(s)</Badge>
                      <ChevronRight className="size-3" />
                      <button className="text-primary hover:underline" onClick={() => { setFilterSectionId(s.id); setTab("classes"); }}>Voir les classes</button>
                    </div>
                    {classes.filter(c => c.sectionId === s.id).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">{classes.filter(c => c.sectionId === s.id).map(c => <Badge key={c.id} variant="outline" className="text-xs">{c.nom}</Badge>)}</div>
                    )}
                    <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => openCreateClasse(s.id)}><Plus className="size-4 mr-1" />Ajouter une classe</Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Label className="text-sm text-muted-foreground">Section:</Label>
              <Select value={filterSectionId} onValueChange={setFilterSectionId}><SelectTrigger className="w-[200px]"><SelectValue placeholder="Toutes" /></SelectTrigger><SelectContent>
                <SelectItem value="all">Toutes les sections</SelectItem>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <Button size="sm" onClick={() => openCreateClasse()} disabled={sections.length === 0}><Plus className="size-4 mr-1" />Creer une classe</Button>
          </div>
          {loadingSC ? <TableSkeleton /> : filteredClasses.length === 0 ? (
            <Card><CardContent className="py-12 text-center text-muted-foreground">Aucune classe.</CardContent></Card>
          ) : (
            <Card><CardContent className="p-0"><table className="w-full"><thead><tr className="border-b">
              <th className="text-left p-4 font-medium">Classe</th><th className="text-left p-4 font-medium">Section</th><th className="text-right p-4 font-medium">Actions</th>
            </tr></thead><tbody>
              {filteredClasses.map(c => (<tr key={c.id} className="border-b last:border-0 hover:bg-muted/50">
                <td className="p-4 font-medium">{c.nom}</td>
                <td className="p-4 text-muted-foreground">{sections.find(s => s.id === c.sectionId)?.nom || c.sectionNom || "--"}</td>
                <td className="p-4 text-right"><div className="flex gap-1 justify-end">
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => openEditClasse(c)}><Pencil className="size-4" /></Button>
                  <Button variant="ghost" size="icon" className="size-8" onClick={() => setDeleteClasse(c)}><Trash2 className="size-4 text-destructive" /></Button>
                </div></td>
              </tr>))}
            </tbody></table></CardContent></Card>
          )}
        </>
      )}

      <Dialog open={showSectionDialog} onOpenChange={setShowSectionDialog}><DialogContent>
        <DialogHeader><DialogTitle>{editingSection ? "Modifier la section" : "Creer une section"}</DialogTitle><DialogDescription>{editingSection ? "Modifiez les informations." : "Renseignez le nom et la description."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label htmlFor="sec-nom">Nom</Label><Input id="sec-nom" placeholder="Ex: GLSI, Informatique..." value={sectionForm.nom} onChange={e => setSectionForm({ ...sectionForm, nom: e.target.value })} /></div>
          <div className="space-y-2"><Label htmlFor="sec-desc">Description</Label><Input id="sec-desc" placeholder="Ex: Genie logiciel" value={sectionForm.description} onChange={e => setSectionForm({ ...sectionForm, description: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowSectionDialog(false)}>Annuler</Button><Button onClick={saveSection} disabled={savingSection}>{savingSection && <Loader2 className="size-4 mr-2 animate-spin" />}{editingSection ? "Enregistrer" : "Creer"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <Dialog open={showClasseDialog} onOpenChange={setShowClasseDialog}><DialogContent>
        <DialogHeader><DialogTitle>{editingClasse ? "Modifier la classe" : "Creer une classe"}</DialogTitle><DialogDescription>{editingClasse ? "Modifiez les informations." : "Renseignez le nom et la section."}</DialogDescription></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2"><Label>Section</Label><Select value={classeForm.sectionId} onValueChange={v => setClasseForm({ ...classeForm, sectionId: v })}><SelectTrigger><SelectValue placeholder="Selectionner..." /></SelectTrigger><SelectContent>{sections.map(s => <SelectItem key={s.id} value={s.id}>{s.nom}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label htmlFor="cls-nom">Nom</Label><Input id="cls-nom" placeholder="Ex: 1ere annee, 2eme annee..." value={classeForm.nom} onChange={e => setClasseForm({ ...classeForm, nom: e.target.value })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => setShowClasseDialog(false)}>Annuler</Button><Button onClick={saveClasse} disabled={savingClasse}>{savingClasse && <Loader2 className="size-4 mr-2 animate-spin" />}{editingClasse ? "Enregistrer" : "Creer"}</Button></DialogFooter>
      </DialogContent></Dialog>

      <ConfirmDialog open={!!deleteSection} onOpenChange={o => !o && setDeleteSection(null)} title="Supprimer la section ?" description={deleteSection ? `Supprimer "${deleteSection.nom}" et toutes ses classes ?` : ""} onConfirm={confirmDeleteSection} />
      <ConfirmDialog open={!!deleteClasse} onOpenChange={o => !o && setDeleteClasse(null)} title="Supprimer la classe ?" description={deleteClasse ? `Supprimer "${deleteClasse.nom}" ?` : ""} onConfirm={confirmDeleteClasse} />
    </div>
  );
}

// src/lib/soap-services.ts
//
// Typed, high-level wrappers around the SOAP operations exposed by the Backend.
// Each function builds the right SOAP call (service + operation + params) and
// returns a typed JS object parsed from the XML response.
//
// These map 1:1 to the Backend's WSDL operations — no invented operations.

import { callSoap } from "./soap-client";
import type {
  AuthResult,
  Bilan,
  Compte,
  DeleteResult,
  Dossier,
  LogoutResult,
  Matiere,
  Note,
  Role,
  TypeNote,
  Section,
  Classe,
  Affectations,
  AssignResult,
} from "@/types";

// ---------------------------------------------------------------
// Auth service (public)
// ---------------------------------------------------------------

export async function seConnecter(email: string, motDePasse: string) {
  // Response shape: { jeton, utilisateur: {...} }
  return callSoap<AuthResult>("auth", "seConnecter", { email, motDePasse });
}

export async function seDeconnecter(jeton: string) {
  return callSoap<LogoutResult>("auth", "seDeconnecter", { jeton });
}

// ---------------------------------------------------------------
// Accounts service (admin only) — CRUD on accounts
// ---------------------------------------------------------------

export interface CreateCompteInput {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  role: Role;
  classe?: string;
  matricule?: string;
  dateNaissance?: string;
  adresse?: string;
}

export async function creerCompte(input: CreateCompteInput, token: string) {
  const res = await callSoap<{ compte: Compte }>(
    "accounts",
    "creerCompte",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.compte;
}

export async function listerComptes(role: Role | "", token: string) {
  const params: Record<string, unknown> = {};
  if (role) params.role = role;
  const res = await callSoap<{ comptes: Compte[] }>(
    "accounts",
    "listerComptes",
    params,
    { token }
  );
  // The SOAP wrapper returns { comptes: { compte: [...] } }; our parser already
  // unwraps single-wrapper-with-array into a plain array.
  return unwrapList(res.comptes) as Compte[];
}

export interface UpdateCompteInput {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  classe?: string;
  motDePasse?: string;
}

export async function modifierCompte(input: UpdateCompteInput, token: string) {
  const res = await callSoap<{ compte: Compte }>(
    "accounts",
    "modifierCompte",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.compte;
}

export async function supprimerCompte(id: string, token: string) {
  return callSoap<DeleteResult>("accounts", "supprimerCompte", { id }, { token });
}

// ---------------------------------------------------------------
// Students service — CRUD on student dossiers
// ---------------------------------------------------------------

export interface CreateDossierInput {
  nom: string;
  prenom: string;
  email: string;
  motDePasse: string;
  classe: string;
  matricule: string;
  dateNaissance?: string;
  adresse?: string;
}

export async function creerDossier(input: CreateDossierInput, token: string) {
  const res = await callSoap<{ dossier: Dossier }>(
    "students",
    "creerDossier",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.dossier;
}

export async function listerDossiers(classe: string, token: string) {
  const params: Record<string, unknown> = {};
  if (classe) params.classe = classe;
  const res = await callSoap<{ dossiers: Dossier[] }>(
    "students",
    "listerDossiers",
    params,
    { token }
  );
  return unwrapList(res.dossiers) as Dossier[];
}

export async function consulterDossier(id: string, token: string) {
  const res = await callSoap<{ dossier: Dossier }>(
    "students",
    "consulterDossier",
    { id },
    { token }
  );
  return res.dossier;
}

export async function consulterMonDossier(token: string) {
  const res = await callSoap<{ dossier: Dossier }>(
    "students",
    "consulterMonDossier",
    {},
    { token }
  );
  return res.dossier;
}

export async function listerMesEtudiants(classe: string, token: string) {
  const params: Record<string, unknown> = {};
  if (classe) params.classe = classe;
  const res = await callSoap<{ dossiers: Dossier[] }>(
    "students",
    "listerMesEtudiants",
    params,
    { token }
  );
  return unwrapList(res.dossiers) as Dossier[];
}

export interface UpdateDossierInput {
  id: string;
  nom?: string;
  prenom?: string;
  email?: string;
  classe?: string;
  matricule?: string;
  dateNaissance?: string;
  adresse?: string;
}

export async function modifierDossier(input: UpdateDossierInput, token: string) {
  const res = await callSoap<{ dossier: Dossier }>(
    "students",
    "modifierDossier",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.dossier;
}

export async function supprimerDossier(id: string, token: string) {
  return callSoap<DeleteResult>("students", "supprimerDossier", { id }, { token });
}

// ---------------------------------------------------------------
// Subjects service — CRUD on matières
// ---------------------------------------------------------------

export interface CreateMatiereInput {
  intitule: string;
  coefficient: number;
  enseignantId: string;
}

export async function creerMatiere(input: CreateMatiereInput, token: string) {
  const res = await callSoap<{ matiere: Matiere }>(
    "subjects",
    "creerMatiere",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.matiere;
}

export async function listerMatieres(token: string) {
  const res = await callSoap<{ matieres: Matiere[] }>(
    "subjects",
    "listerMatieres",
    {},
    { token }
  );
  return unwrapList(res.matieres) as Matiere[];
}

export async function listerMesMatieres(token: string) {
  const res = await callSoap<{ matieres: Matiere[] }>(
    "subjects",
    "listerMesMatieres",
    {},
    { token }
  );
  return unwrapList(res.matieres) as Matiere[];
}

export interface UpdateMatiereInput {
  id: string;
  intitule?: string;
  coefficient?: number;
  enseignantId?: string;
}

export async function modifierMatiere(input: UpdateMatiereInput, token: string) {
  const res = await callSoap<{ matiere: Matiere }>(
    "subjects",
    "modifierMatiere",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.matiere;
}

export async function supprimerMatiere(id: string, token: string) {
  return callSoap<DeleteResult>("subjects", "supprimerMatiere", { id }, { token });
}

// ---------------------------------------------------------------
// Notes service — grades & averages
// ---------------------------------------------------------------

export interface SaisirNoteInput {
  etudiantId: string;
  matiereId: string;
  valeur: number;
  type: TypeNote;
}

export async function saisirNote(input: SaisirNoteInput, token: string) {
  const res = await callSoap<{ note: Note }>(
    "notes",
    "saisirNote",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.note;
}

export interface ModifierNoteInput {
  id: string;
  valeur: number;
  type?: TypeNote;
}

export async function modifierNote(input: ModifierNoteInput, token: string) {
  const res = await callSoap<{ note: Note }>(
    "notes",
    "modifierNote",
    input as unknown as Record<string, unknown>,
    { token }
  );
  return res.note;
}

export async function supprimerNote(id: string, token: string) {
  return callSoap<DeleteResult>("notes", "supprimerNote", { id }, { token });
}

export async function consulterNotesEnseignant(
  filters: { matiereId?: string; etudiantId?: string },
  token: string
) {
  const params: Record<string, unknown> = {};
  if (filters.matiereId) params.matiereId = filters.matiereId;
  if (filters.etudiantId) params.etudiantId = filters.etudiantId;
  const res = await callSoap<{ notes: Note[] }>(
    "notes",
    "consulterNotesEnseignant",
    params,
    { token }
  );
  return unwrapList(res.notes) as Note[];
}

export async function consulterMoyennesClasse(classe: string, token: string) {
  const params: Record<string, unknown> = {};
  if (classe) params.classe = classe;
  const res = await callSoap<{ bilans: Bilan[] }>(
    "notes",
    "consulterMoyennesClasse",
    params,
    { token }
  );
  return unwrapList(res.bilans) as Bilan[];
}

export async function consulterMesNotes(token: string) {
  const res = await callSoap<{ notes: Note[] }>(
    "notes",
    "consulterMesNotes",
    {},
    { token }
  );
  return unwrapList(res.notes) as Note[];
}

export async function consulterMonBilan(token: string) {
  const res = await callSoap<{ bilan: Bilan }>(
    "notes",
    "consulterMonBilan",
    {},
    { token }
  );
  return res.bilan;
}

// ---------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------

/**
 * Normalize a parsed SOAP list wrapper value into a JS array.
 *
 * The parser produces, for a wrapper element like <comptes>:
 *   - ""                          when the wrapper is empty (<comptes/>)
 *   - { compte: {...} }           when there is a SINGLE item (parser groups the
 *                                 one <compte/> child under its local name)
 *   - [{...}, {...}]              when there are MULTIPLE items (all-same-name → array)
 *
 * This helper turns all three forms into a clean T[].
 */
// Sections service
export async function creerSection(nom: string, description: string, token: string) {
  const res = await callSoap<{ section: Section }>("sections", "creerSection", { nom, description }, { token });
  return res.section;
}
export async function listerSections(token: string) {
  const res = await callSoap<{ sections: Section[] }>("sections", "listerSections", {}, { token });
  return unwrapList(res.sections) as Section[];
}
export async function modifierSection(id: string, nom: string, description: string, token: string) {
  const params: Record<string, unknown> = { id };
  if (nom) params.nom = nom;
  if (description !== undefined) params.description = description;
  const res = await callSoap<{ section: Section }>("sections", "modifierSection", params, { token });
  return res.section;
}
export async function supprimerSection(id: string, token: string) {
  return callSoap<DeleteResult>("sections", "supprimerSection", { id }, { token });
}
export async function creerClasse(nom: string, sectionId: string, token: string) {
  const res = await callSoap<{ classe: Classe }>("sections", "creerClasse", { nom, sectionId }, { token });
  return res.classe;
}
export async function listerClasses(sectionId: string, token: string) {
  const params: Record<string, unknown> = {};
  if (sectionId) params.sectionId = sectionId;
  const res = await callSoap<{ classes: Classe[] }>("sections", "listerClasses", params, { token });
  return unwrapList(res.classes) as Classe[];
}
export async function modifierClasse(id: string, nom: string, sectionId: string, token: string) {
  const params: Record<string, unknown> = { id };
  if (nom) params.nom = nom;
  if (sectionId) params.sectionId = sectionId;
  const res = await callSoap<{ classe: Classe }>("sections", "modifierClasse", params, { token });
  return res.classe;
}
export async function supprimerClasse(id: string, token: string) {
  return callSoap<DeleteResult>("sections", "supprimerClasse", { id }, { token });
}
export async function assignerEnseignantSections(userId: string, sectionIds: string[], token: string) {
  return callSoap<AssignResult>("sections", "assignerEnseignantSections", { userId, sectionIds: { uuid: sectionIds } }, { token });
}
export async function assignerEnseignantClasses(userId: string, classeIds: string[], token: string) {
  return callSoap<AssignResult>("sections", "assignerEnseignantClasses", { userId, classeIds: { uuid: classeIds } }, { token });
}
export async function consulterAffectationsEnseignant(userId: string, token: string) {
  const res = await callSoap<{ affectations: Affectations }>("sections", "consulterAffectationsEnseignant", { userId }, { token });
  return res.affectations;
}
export async function assignerEtudiantSection(etudiantId: string, sectionId: string, classeId: string, token: string) {
  return callSoap<AssignResult>("sections", "assignerEtudiantSection", { etudiantId, sectionId, classeId }, { token });
}

function unwrapList<T>(v: unknown): T[] {
  if (v === null || v === undefined || v === "") return [];
  if (Array.isArray(v)) return v as T[];
  if (typeof v === "object") {
    const keys = Object.keys(v);
    if (keys.length === 1) {
      // single-item wrapper: { itemKey: item }
      return [(v as Record<string, unknown>)[keys[0]] as T];
    }
    // defensive: treat the object itself as a single item
    return [v as T];
  }
  return [];
}

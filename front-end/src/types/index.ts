// Central TypeScript types — mirror the Backend WSDL contracts (read-only analysis).
// These describe the data exchanged with the SOAP services; they do NOT modify the Backend.

export type Role = "administrateur" | "enseignant" | "etudiant";

export type TypeNote = "DS" | "examen" | "TP";

export type Mention =
  | "ajourne"
  | "passable"
  | "assez_bien"
  | "bien"
  | "tres_bien";

export type Statut = "admis" | "ajourne";

/** Authenticated user (from seConnecter / JWT payload). */
export interface Utilisateur {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  classe?: string | null;
}

/** Login response (seConnecter). */
export interface AuthResult {
  jeton: string;
  utilisateur: Utilisateur;
}

/** Account (Compte) — Accounts service. */
export interface Compte {
  id: string;
  nom: string;
  prenom: string;
  email: string;
  role: Role;
  classe: string;
}

/** Student dossier — Students service (compte + academic record). */
export interface Dossier {
  sectionId?: string;
  sectionNom?: string;
  classeId?: string;
  classeNom?: string;
  id: string;
  userId: string;
  nom: string;
  prenom: string;
  email: string;
  classe: string;
  matricule: string;
  dateNaissance: string;
  adresse: string;
}

/** Subject (Matiere) — Subjects service. */
export interface Matiere {
  sectionId?: string;
  sectionNom?: string;
  classeId?: string;
  classeNom?: string;
  id: string;
  intitule: string;
  coefficient: number;
  enseignantId: string;
  enseignantNom: string;
  enseignantPrenom: string;
}

/** Grade (Note) — Notes service (denormalized for views). */
export interface Note {
  id: string;
  etudiantId: string;
  matiereId: string;
  valeur: number;
  type: TypeNote;
  etudiantNom: string;
  etudiantPrenom: string;
  matiereIntitule: string;
  coefficient: number;
}

/** Academic summary (Bilan) — Notes service. */
export interface Bilan {
  etudiantId: string;
  etudiantNom: string;
  etudiantPrenom: string;
  classe: string;
  moyenne: number;
  mention: Mention;
  statut: Statut;
  nbMatieres: number;
}

/** Generic delete result. */
export interface DeleteResult {
  succes: boolean;
  message: string;
}

/** Logout result. */
export interface LogoutResult {
  succes: boolean;
  message: string;
}

/** Structured SOAP fault surfaced to the frontend. */
export interface SoapFault {
  code: string;
  message: string;
  champsManquants?: string[];
}

// ===== Sections & Classes =====
export interface Section { id: string; nom: string; description: string; classes?: Classe[]; }
export interface Classe { id: string; nom: string; sectionId: string; sectionNom?: string; }
export interface Affectations { sections: Section[]; classes: Classe[]; }
export interface AssignResult { succes: boolean; message: string; }

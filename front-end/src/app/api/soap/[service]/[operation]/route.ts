// src/app/api/soap/[service]/[operation]/route.ts
//
// Catch-all SOAP proxy: the frontend calls /api/soap/<service>/<operation> with a
// JSON body (+ Authorization: Bearer <jwt> when authenticated). This route maps
// the call to the matching typed SOAP service function, which builds a real
// SOAP/XML envelope, sends it to the in-process Backend SOAP server, parses the
// XML response, and returns JSON to the frontend.
//
// This is the ONLY frontend↔Next.js boundary; everything beyond this point is
// genuine SOAP/XML to the Backend.

import { NextRequest, NextResponse } from "next/server";
import { SoapFaultError } from "@/lib/soap-client";
import {
  creerCompte,
  listerComptes,
  modifierCompte,
  supprimerCompte,
  seConnecter,
  seDeconnecter,
  creerDossier,
  listerDossiers,
  consulterDossier,
  consulterMonDossier,
  listerMesEtudiants,
  modifierDossier,
  supprimerDossier,
  creerMatiere,
  listerMatieres,
  listerMesMatieres,
  modifierMatiere,
  supprimerMatiere,
  saisirNote,
  modifierNote,
  supprimerNote,
  consulterNotesEnseignant,
  consulterMoyennesClasse,
  consulterMesNotes,
  consulterMonBilan,
  creerSection,
  listerSections,
  modifierSection,
  supprimerSection,
  creerClasse,
  listerClasses,
  modifierClasse,
  supprimerClasse,
  assignerEnseignantSections,
  assignerEnseignantClasses,
  consulterAffectationsEnseignant,
  assignerEtudiantSection,
} from "@/lib/soap-services";

// Allow long-running calls (the first backend boot can take ~60s).
export const maxDuration = 120;
export const dynamic = "force-dynamic";

type Handler = (body: any, token: string | null) => Promise<unknown>;

// Dispatch table: service -> operation -> handler.
const ROUTES: Record<string, Record<string, Handler>> = {
  auth: {
    login: async (body) => seConnecter(body.email, body.motDePasse),
    logout: async (body) => seDeconnecter(body.jeton),
  },
  accounts: {
    create: async (body, token) => creerCompte(body, token!),
    list: async (body, token) => listerComptes(body.role ?? "", token!),
    update: async (body, token) => modifierCompte(body, token!),
    delete: async (body, token) => supprimerCompte(body.id, token!),
  },
  students: {
    create: async (body, token) => creerDossier(body, token!),
    list: async (body, token) => listerDossiers(body.classe ?? "", token!),
    get: async (body, token) => consulterDossier(body.id, token!),
    me: async (_body, token) => consulterMonDossier(token!),
    teacherList: async (body, token) => listerMesEtudiants(body.classe ?? "", token!),
    update: async (body, token) => modifierDossier(body, token!),
    delete: async (body, token) => supprimerDossier(body.id, token!),
  },
  subjects: {
    create: async (body, token) => creerMatiere(body, token!),
    list: async (_body, token) => listerMatieres(token!),
    myList: async (_body, token) => listerMesMatieres(token!),
    update: async (body, token) => modifierMatiere(body, token!),
    delete: async (body, token) => supprimerMatiere(body.id, token!),
  },
  notes: {
    create: async (body, token) => saisirNote(body, token!),
    update: async (body, token) => modifierNote(body, token!),
    delete: async (body, token) => supprimerNote(body.id, token!),
    teacherList: async (body, token) =>
      consulterNotesEnseignant(
        { matiereId: body.matiereId, etudiantId: body.etudiantId },
        token!
      ),
    averages: async (body, token) =>
      consulterMoyennesClasse(body.classe ?? "", token!),
    myList: async (_body, token) => consulterMesNotes(token!),
    myBilan: async (_body, token) => consulterMonBilan(token!),
  },
  sections: {
    create: async (body, token) => creerSection(body.nom, body.description, token!),
    list: async (_body, token) => listerSections(token!),
    update: async (body, token) => modifierSection(body.id, body.nom, body.description, token!),
    delete: async (body, token) => supprimerSection(body.id, token!),
    createClasse: async (body, token) => creerClasse(body.nom, body.sectionId, token!),
    listClasses: async (body, token) => listerClasses(body.sectionId ?? "", token!),
    updateClasse: async (body, token) => modifierClasse(body.id, body.nom, body.sectionId, token!),
    deleteClasse: async (body, token) => supprimerClasse(body.id, token!),
    assignTeacherSections: async (body, token) => assignerEnseignantSections(body.userId, body.sectionIds, token!),
    assignTeacherClasses: async (body, token) => assignerEnseignantClasses(body.userId, body.classeIds, token!),
    teacherAssignments: async (body, token) => consulterAffectationsEnseignant(body.userId, token!),
    assignStudent: async (body, token) => assignerEtudiantSection(body.etudiantId, body.sectionId, body.classeId, token!),
  },
};

export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ service: string; operation: string }> }
) {
  const { service, operation } = await ctx.params;
  const serviceRoutes = ROUTES[service];
  if (!serviceRoutes) {
    return NextResponse.json(
      { code: "SERVICE_INCONNU", message: `Service inconnu: ${service}` },
      { status: 404 }
    );
  }
  const handler = serviceRoutes[operation];
  if (!handler) {
    return NextResponse.json(
      { code: "OPERATION_INCONNUE", message: `Opération inconnue: ${operation}` },
      { status: 404 }
    );
  }

  // Parse JSON body (allow empty for parameter-less ops).
  let body: any = {};
  try {
    const text = await req.text();
    if (text.trim()) body = JSON.parse(text);
  } catch {
    return NextResponse.json(
      { code: "REQUETE_INVALIDE", message: "Corps JSON invalide" },
      { status: 400 }
    );
  }

  // Forward the JWT (the backend's SOAP services read it from the Authorization header).
  const auth = req.headers.get("authorization") || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;

  try {
    const data = await handler(body, token);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    if (err instanceof SoapFaultError) {
      // SOAP fault → 400 with structured detail.
      return NextResponse.json(
        {
          ok: false,
          code: err.code,
          message: err.message,
          champsManquants: err.champsManquants,
        },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      { ok: false, code: "ERREUR", message },
      { status: 500 }
    );
  }
}

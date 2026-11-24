// src/controllers/controleurNotes.js
// Sprint 4 — Service Notes & Moyennes (BF10-BF13, BF15-BF18).
//
// Règles de gestion (cahier des charges §4.5) :
//   - une note ∈ [0, 20]
//   - moyenne générale = Σ(note × coef) / Σ(coef), pondérée par les coefficients
//     des matières. NOTE: on calcule la moyenne par matière (moyenne des types
//     DS/examen/TP), puis on pondère ces moyennes de matière par les coefficients.
//   - statut : ajourné si moyenne < 10, admis si moyenne ≥ 10
//   - mention :
//       < 10                 → ajourné (pas une mention, mais renvoyé pour cohérence)
//       [10, 12[             → passable
//       [12, 14[             → assez bien
//       [14, 16[             → bien
//       ≥ 16                 → très bien
//   - recalcul automatique après toute modification d'une note (les bilans sont
//     toujours calculés à la volée à partir des notes courantes).

const { Note, Etudiant, Matiere, User } = require('../models');
const { buildFault, FaultCodes } = require('../utils/erreurs');

const VALID_TYPES = ['DS', 'examen', 'TP'];

/**
 * Moyenne par matière = moyenne arithmétique des notes (DS + examen + TP) de
 * cette matière. Si l'étudiant n'a aucune note dans la matière, elle ne compte
 * pas dans la moyenne générale.
 */
function moyenneMatiere(notes) {
  if (!notes || notes.length === 0) return null;
  const sum = notes.reduce((acc, n) => acc + Number(n.valeur), 0);
  return sum / notes.length;
}

/**
 * Moyenne générale pondérée par les coefficients des matières.
 *   mg = Σ(moyMatiere_i × coef_i) / Σ(coef_i)
 */
function moyenneGenerale(notesParMatiere) {
  let num = 0;
  let den = 0;
  for (const { coef, notes } of notesParMatiere) {
    const m = moyenneMatiere(notes);
    if (m === null) continue;
    num += m * coef;
    den += coef;
  }
  if (den === 0) return null;
  return num / den;
}

/** Mention à partir de la moyenne générale. */
function calculerMention(moyenne) {
  if (moyenne === null || moyenne === undefined || Number.isNaN(moyenne)) return 'ajourne';
  if (moyenne < 10) return 'ajourne';
  if (moyenne < 12) return 'passable';
  if (moyenne < 14) return 'assez_bien';
  if (moyenne < 16) return 'bien';
  return 'tres_bien';
}

/** Statut (admis / ajourné). */
function calculerStatut(moyenne) {
  if (moyenne === null || moyenne === undefined || Number.isNaN(moyenne)) return 'ajourne';
  return moyenne >= 10 ? 'admis' : 'ajourne';
}

/**
 * Formate une Note (avec ses associations) pour le WSDL Note type.
 */
function toNote(n) {
  const e = n.etudiant;
  const m = n.matiere;
  const u = e && (e.compte || e.User);
  return {
    id: n.id,
    etudiantId: n.etudiantId,
    matiereId: n.matiereId,
    valeur: Number(n.valeur),
    type: n.type,
    etudiantNom: u ? u.nom : '',
    etudiantPrenom: u ? u.prenom : '',
    matiereIntitule: m ? m.intitule : '',
    coefficient: m ? Number(m.coefficient) : 0,
  };
}

/**
 * Calcule le bilan (moyenne/mention/statut) d'un étudiant à partir de ses notes.
 * @param {Etudiant} etudiant  avec .compte (User) chargé
 */
async function calculerBilan(etudiant) {
  // Toutes les notes de l'étudiant, avec la matière associée.
  const notes = await Note.findAll({
    where: { etudiantId: etudiant.id },
    include: [{ model: Matiere, as: 'matiere' }],
  });

  // Grouper par matière.
  const parMatiere = new Map();
  for (const n of notes) {
    const k = n.matiereId;
    if (!parMatiere.has(k)) parMatiere.set(k, { coef: Number(n.matiere?.coefficient || 0), notes: [] });
    parMatiere.get(k).notes.push(n);
  }

  const mg = moyenneGenerale(Array.from(parMatiere.values()));
  const u = etudiant.compte || etudiant.User;
  return {
    etudiantId: etudiant.id,
    etudiantNom: u ? u.nom : '',
    etudiantPrenom: u ? u.prenom : '',
    classe: (u && u.classe) || '',
    moyenne: mg === null ? 0 : Math.round(mg * 100) / 100,
    mention: calculerMention(mg),
    statut: calculerStatut(mg),
    nbMatieres: parMatiere.size,
  };
}

/**
 * saisirNote — BF10. L'enseignant connecté doit être responsable de la matière.
 * Input:  { etudiantId, matiereId, valeur, type }
 * Output: { note }
 */
async function saisirNote(args, requestingUser) {
  const { etudiantId, matiereId, valeur, type } = args || {};

  const missing = [];
  if (!etudiantId) missing.push('etudiantId');
  if (!matiereId) missing.push('matiereId');
  if (valeur === undefined || valeur === null) missing.push('valeur');
  if (!type) missing.push('type');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  // Validate type
  if (!VALID_TYPES.includes(type)) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, `Type de note invalide: ${type}. Valeurs attendues: ${VALID_TYPES.join(', ')}`);
  }

  // Validate valeur ∈ [0, 20]
  const v = Number(valeur);
  if (Number.isNaN(v) || v < 0 || v > 20) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, 'La note doit être comprise entre 0 et 20');
  }

  // Vérifier que l'étudiant existe
  const etudiant = await Etudiant.findByPk(etudiantId, { include: [{ model: User, as: 'compte' }] });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun étudiant avec l'id ${etudiantId}`);
  }

  // Vérifier que la matière existe
  const matiere = await Matiere.findByPk(matiereId);
  if (!matiere) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune matière avec l'id ${matiereId}`);
  }

  // RBAC : l'enseignant ne peut saisir que dans ses matières. L'admin peut tout.
  if (requestingUser.role === 'enseignant' && String(matiere.enseignantId) !== String(requestingUser.id)) {
    throw buildFault(FaultCodes.ACCES_REFUSE, "Vous n'êtes pas l'enseignant responsable de cette matière");
  }
  if (requestingUser.role !== 'enseignant' && requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Seul un enseignant (ou un admin) peut saisir une note');
  }

  // Doublon : (etudiant, matiere, type) unique
  const exists = await Note.findOne({ where: { etudiantId, matiereId, type } });
  if (exists) {
    throw buildFault(FaultCodes.DOUBLON, `Une note de type ${type} existe déjà pour cet étudiant dans cette matière`);
  }

  const note = await Note.create({ etudiantId, matiereId, valeur: v, type });
  const fresh = await Note.findByPk(note.id, {
    include: [
      { model: Etudiant, as: 'etudiant', include: [{ model: User, as: 'compte' }] },
      { model: Matiere, as: 'matiere' },
    ],
  });
  return { note: toNote(fresh) };
}

/**
 * modifierNote — BF11. Modifie la valeur (et optionnellement le type).
 * Output: { note } — recalcul implicite (les bilans sont à la volée).
 */
async function modifierNote(args, requestingUser) {
  const { id, valeur, type } = args || {};
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  if (valeur === undefined || valeur === null) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['valeur']);
  }

  const note = await Note.findByPk(id, {
    include: [{ model: Matiere, as: 'matiere' }],
  });
  if (!note) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune note avec l'id ${id}`);
  }

  // RBAC : enseignant responsable ou admin
  if (requestingUser.role === 'enseignant' && String(note.matiere.enseignantId) !== String(requestingUser.id)) {
    throw buildFault(FaultCodes.ACCES_REFUSE, "Vous n'êtes pas l'enseignant responsable de cette matière");
  }
  if (requestingUser.role !== 'enseignant' && requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Accès non autorisé');
  }

  // Validate valeur
  const v = Number(valeur);
  if (Number.isNaN(v) || v < 0 || v > 20) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, 'La note doit être comprise entre 0 et 20');
  }

  // Optional type change
  let newType = note.type;
  if (type) {
    if (!VALID_TYPES.includes(type)) {
      throw buildFault(FaultCodes.VALEUR_INVALIDE, `Type de note invalide: ${type}`);
    }
    // Check uniqueness if changing type
    if (type !== note.type) {
      const conflict = await Note.findOne({ where: { etudiantId: note.etudiantId, matiereId: note.matiereId, type } });
      if (conflict) {
        throw buildFault(FaultCodes.DOUBLON, `Une note de type ${type} existe déjà pour cet étudiant dans cette matière`);
      }
      newType = type;
    }
  }

  note.valeur = v;
  note.type = newType;
  await note.save();

  const fresh = await Note.findByPk(id, {
    include: [
      { model: Etudiant, as: 'etudiant', include: [{ model: User, as: 'compte' }] },
      { model: Matiere, as: 'matiere' },
    ],
  });
  return { note: toNote(fresh) };
}

/**
 * supprimerNote — enseignant responsable ou admin.
 */
async function supprimerNote(args, requestingUser) {
  const { id } = args || {};
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const note = await Note.findByPk(id, { include: [{ model: Matiere, as: 'matiere' }] });
  if (!note) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune note avec l'id ${id}`);
  }
  if (requestingUser.role === 'enseignant' && String(note.matiere.enseignantId) !== String(requestingUser.id)) {
    throw buildFault(FaultCodes.ACCES_REFUSE, "Vous n'êtes pas l'enseignant responsable de cette matière");
  }
  if (requestingUser.role !== 'enseignant' && requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Accès non autorisé');
  }
  await note.destroy();
  return { succes: true, message: `Note #${id} supprimée` };
}

/**
 * consulterNotesEnseignant — BF12. Notes des matières de l'enseignant connecté.
 * Filtres optionnels : matiereId, etudiantId.
 */
async function consulterNotesEnseignant(args, requestingUser) {
  if (requestingUser.role !== 'enseignant' && requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux enseignants (et admins)');
  }

  // Récupérer les matières de l'enseignant
  const where = {};
  if (requestingUser.role === 'enseignant') {
    where.enseignantId = requestingUser.id;
  }
  const matieres = await Matiere.findAll({ where, attributes: ['id'] });
  const matiereIds = matieres.map((m) => m.id);

  if (matiereIds.length === 0) {
    return { notes: { note: [] } };
  }

  const noteWhere = { matiereId: { [Symbol.for('or')]: matiereIds } };
  // Sequelize Op.in is cleaner; use it directly.
  const { Op } = require('sequelize');
  const noteWhere2 = { matiereId: { [Op.in]: matiereIds } };
  if (args && args.etudiantId) noteWhere2.etudiantId = args.etudiantId;
  if (args && args.matiereId) noteWhere2.matiereId = args.matiereId;

  const notes = await Note.findAll({
    where: noteWhere2,
    include: [
      { model: Etudiant, as: 'etudiant', include: [{ model: User, as: 'compte' }] },
      { model: Matiere, as: 'matiere' },
    ],
    order: [['matiereId', 'ASC'], ['etudiantId', 'ASC'], ['type', 'ASC']],
  });

  return { notes: { note: notes.map(toNote) } };
}

/**
 * consulterMoyennesClasse — BF13. Bilans des étudiants qui ont au moins une note
 * dans les matières de l'enseignant. Filtrable par classe.
 */
async function consulterMoyennesClasse(args, requestingUser) {
  if (requestingUser.role !== 'enseignant' && requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux enseignants (et admins)');
  }

  // Récupérer les matières de l'enseignant
  const { Op } = require('sequelize');
  const mWhere = {};
  if (requestingUser.role === 'enseignant') mWhere.enseignantId = requestingUser.id;
  const matieres = await Matiere.findAll({ where: mWhere, attributes: ['id'] });
  const matiereIds = matieres.map((m) => m.id);

  if (matiereIds.length === 0) {
    return { bilans: { bilan: [] } };
  }

  // Étudiants ayant au moins une note dans ces matières
  const notes = await Note.findAll({
    where: { matiereId: { [Op.in]: matiereIds } },
    attributes: ['etudiantId'],
    group: ['etudiantId'],
  });
  const etudiantIds = notes.map((n) => n.etudiantId);
  if (etudiantIds.length === 0) {
    return { bilans: { bilan: [] } };
  }

  // Filtrer par classe si demandé (via le compte)
  const eWhere = { id: { [Op.in]: etudiantIds } };
  const etudiants = await Etudiant.findAll({
    where: eWhere,
    include: [{ model: User, as: 'compte' }],
  });

  let filtered = etudiants;
  if (args && args.classe) {
    filtered = etudiants.filter((e) => e.compte && e.compte.classe === args.classe);
  }

  const bilans = [];
  for (const e of filtered) {
    bilans.push(await calculerBilan(e));
  }

  return { bilans: { bilan: bilans } };
}

/**
 * consulterMesNotes — BF15. L'étudiant consulte toutes ses notes.
 */
async function consulterMesNotes(userId) {
  const etudiant = await Etudiant.findOne({ where: { userId } });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier étudiant pour l'utilisateur ${userId}`);
  }
  const notes = await Note.findAll({
    where: { etudiantId: etudiant.id },
    include: [
      { model: Etudiant, as: 'etudiant', include: [{ model: User, as: 'compte' }] },
      { model: Matiere, as: 'matiere' },
    ],
    order: [['matiereId', 'ASC'], ['type', 'ASC']],
  });
  return { notes: { note: notes.map(toNote) } };
}

/**
 * consulterMonBilan — BF16, BF17, BF18. L'étudiant consulte sa moyenne / mention / statut.
 */
async function consulterMonBilan(userId) {
  const etudiant = await Etudiant.findOne({
    where: { userId },
    include: [{ model: User, as: 'compte' }],
  });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier étudiant pour l'utilisateur ${userId}`);
  }
  const bilan = await calculerBilan(etudiant);
  return { bilan };
}

module.exports = {
  saisirNote,
  modifierNote,
  supprimerNote,
  consulterNotesEnseignant,
  consulterMoyennesClasse,
  consulterMesNotes,
  consulterMonBilan,
  // exported for tests
  moyenneMatiere,
  moyenneGenerale,
  calculerMention,
  calculerStatut,
  toNote,
  calculerBilan,
};

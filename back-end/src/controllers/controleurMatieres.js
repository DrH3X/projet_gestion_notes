// src/controllers/controleurMatieres.js
// Service Matières (CRUD + affectation enseignant + section/classe).
// A matière is assigned to a teacher AND a section + classe.
// Same intitule can exist in different classes (e.g., "Mathématiques" in GLSI 1ère année and GLSI 2ème année).

const { Matiere, User, Section, Classe } = require('../models');
const { buildFault, FaultCodes } = require('../utils/erreurs');

// Shared include array for queries that return matieres
const MATIERE_INCLUDES = [
  { model: User, as: 'enseignant' },
  { model: Section, as: 'section' },
  { model: Classe, as: 'classeObj' },
];

/**
 * Shape a Matiere row into the WSDL Matiere type.
 * Includes section/classe info when loaded.
 */
function toMatiere(m) {
  return {
    id: m.id,
    intitule: m.intitule,
    coefficient: Number(m.coefficient),
    enseignantId: m.enseignantId,
    enseignantNom: m.enseignant ? m.enseignant.nom : '',
    enseignantPrenom: m.enseignant ? m.enseignant.prenom : '',
    sectionId: m.sectionId || '',
    sectionNom: m.section ? m.section.nom : '',
    classeId: m.classeId || '',
    classeNom: m.classeObj ? m.classeObj.nom : '',
  };
}

/**
 * Helper: check that a teacher exists.
 */
async function requireTeacher(userId) {
  const user = await User.findByPk(userId);
  if (!user) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun utilisateur avec l'id ${userId}`);
  }
  if (user.role !== 'enseignant') {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      `L'utilisateur #${userId} n'est pas un enseignant (rôle actuel: ${user.role})`
    );
  }
  return user;
}

/**
 * Helper: validate that sectionId and classeId exist and are consistent.
 */
async function requireSectionClasse(sectionId, classeId) {
  const section = await Section.findByPk(sectionId);
  if (!section) {
    throw buildFault(FaultCodes.INTROUVABLE, `Section #${sectionId} introuvable`);
  }
  const classe = await Classe.findByPk(classeId);
  if (!classe) {
    throw buildFault(FaultCodes.INTROUVABLE, `Classe #${classeId} introuvable`);
  }
  if (classe.sectionId !== sectionId) {
    throw buildFault(
      FaultCodes.VALEUR_INVALIDE,
      `La classe "${classe.nom}" n'appartient pas à la section "${section.nom}"`
    );
  }
  return { section, classe };
}

/**
 * creerMatiere — creates a subject assigned to a teacher + section + classe.
 * Input:  { intitule, coefficient, enseignantId, sectionId, classeId }
 * Output: { matiere }
 */
async function creerMatiere({ intitule, coefficient, enseignantId, sectionId, classeId }) {
  const missing = [];
  if (!intitule) missing.push('intitule');
  if (coefficient === undefined || coefficient === null) missing.push('coefficient');
  if (!enseignantId) missing.push('enseignantId');
  if (!sectionId) missing.push('sectionId');
  if (!classeId) missing.push('classeId');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  const coef = Number(coefficient);
  if (isNaN(coef) || coef <= 0) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, 'Le coefficient doit être strictement positif');
  }

  // Validate teacher
  await requireTeacher(enseignantId);

  // Validate section + classe consistency
  await requireSectionClasse(sectionId, classeId);

  // Check uniqueness per (intitule, classeId) — same name allowed in different classes
  const existing = await Matiere.findOne({ where: { intitule, classeId } });
  if (existing) {
    throw buildFault(FaultCodes.DOUBLON, `La matière "${intitule}" existe déjà dans cette classe`);
  }

  const m = await Matiere.create({
    intitule,
    coefficient: coef,
    enseignantId,
    sectionId,
    classeId,
  });

  const fresh = await Matiere.findByPk(m.id, { include: MATIERE_INCLUDES });
  return { matiere: toMatiere(fresh) };
}

/**
 * listerMatieres — list all subjects (optionally filtered by section/classe).
 * Input: { sectionId?, classeId? }
 */
async function listerMatieres(args = {}) {
  const { sectionId, classeId } = args || {};
  const where = {};
  if (sectionId) where.sectionId = sectionId;
  if (classeId) where.classeId = classeId;

  const rows = await Matiere.findAll({
    where,
    include: MATIERE_INCLUDES,
    order: [['id', 'ASC']],
  });
  return { matieres: { matiere: rows.map(toMatiere) } };
}

/**
 * listerMesMatieres — BF8: list subjects assigned to the calling teacher.
 * Input: userId (from JWT)
 */
async function listerMesMatieres(userId) {
  const rows = await Matiere.findAll({
    where: { enseignantId: userId },
    include: MATIERE_INCLUDES,
    order: [['id', 'ASC']],
  });
  return { matieres: { matiere: rows.map(toMatiere) } };
}

/**
 * modifierMatiere — update a subject.
 * Admin can change any field; teacher can only change intitule/coefficient on their own matieres.
 */
async function modifierMatiere({ id, intitule, coefficient, enseignantId, sectionId, classeId }, requestingUser) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const m = await Matiere.findByPk(id, { include: MATIERE_INCLUDES });
  if (!m) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune matière avec l'id ${id}`);
  }

  // Authorization
  if (!requestingUser) {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Utilisateur non identifié');
  }
  if (requestingUser.role === 'enseignant') {
    if (String(m.enseignantId) !== String(requestingUser.id)) {
      throw buildFault(FaultCodes.ACCES_REFUSE, "Vous n'êtes pas l'enseignant responsable de cette matière");
    }
    if (enseignantId !== undefined && String(enseignantId) !== String(m.enseignantId)) {
      throw buildFault(FaultCodes.ACCES_REFUSE, "Seul l'administrateur peut changer l'enseignant responsable");
    }
    // Teacher cannot change section/classe
    if (sectionId !== undefined || classeId !== undefined) {
      throw buildFault(FaultCodes.ACCES_REFUSE, "Seul l'administrateur peut changer la section/classe");
    }
  } else if (requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Accès non autorisé');
  }

  if (intitule && intitule !== m.intitule) {
    // Check uniqueness per (intitule, classeId) — only if classeId not changing
    const checkClasseId = classeId || m.classeId;
    const dup = await Matiere.findOne({ where: { intitule, classeId: checkClasseId } });
    if (dup && String(dup.id) !== String(m.id)) {
      throw buildFault(FaultCodes.DOUBLON, `Intitulé déjà utilisé dans cette classe: ${intitule}`);
    }
    m.intitule = intitule;
  }

  if (coefficient !== undefined) {
    const coef = Number(coefficient);
    if (isNaN(coef) || coef <= 0) {
      throw buildFault(FaultCodes.VALEUR_INVALIDE, 'Le coefficient doit être strictement positif');
    }
    m.coefficient = coef;
  }

  if (enseignantId !== undefined) {
    await requireTeacher(enseignantId);
    m.enseignantId = enseignantId;
  }

  // Admin can change section/classe
  if (sectionId !== undefined || classeId !== undefined) {
    const newSectionId = sectionId || m.sectionId;
    const newClasseId = classeId || m.classeId;
    await requireSectionClasse(newSectionId, newClasseId);
    if (sectionId !== undefined) m.sectionId = sectionId;
    if (classeId !== undefined) m.classeId = classeId;
  }

  await m.save();
  const fresh = await Matiere.findByPk(id, { include: MATIERE_INCLUDES });
  return { matiere: toMatiere(fresh) };
}

/**
 * supprimerMatiere — delete a subject.
 */
async function supprimerMatiere({ id }) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const m = await Matiere.findByPk(id);
  if (!m) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune matière avec l'id ${id}`);
  }
  await m.destroy();
  return { succes: true, message: `Matière "${m.intitule}" supprimée` };
}

module.exports = {
  creerMatiere,
  listerMatieres,
  listerMesMatieres,
  modifierMatiere,
  supprimerMatiere,
  toMatiere,
};

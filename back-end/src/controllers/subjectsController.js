// src/controllers/subjectsController.js
// Sprint 3 — Service Matières (CRUD + affectation de l'enseignant).

const { Matiere, User } = require('../models');
const { buildFault, FaultCodes } = require('../utils/faults');

/**
 * Shape a Matiere row (with its teacher) into the WSDL Matiere type.
 * enseignantNom/Prenom are always present (empty string when null).
 */
function toMatiere(m) {
  return {
    id: m.id,
    intitule: m.intitule,
    coefficient: Number(m.coefficient),
    enseignantId: m.enseignantId,
    enseignantNom: m.enseignant ? m.enseignant.nom : '',
    enseignantPrenom: m.enseignant ? m.enseignant.prenom : '',
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
 * creerMatiere — BF5: creates a subject and assigns the teacher in charge.
 * Input:  { intitule, coefficient, enseignantId }
 * Output: { matiere }
 */
async function creerMatiere({ intitule, coefficient, enseignantId }) {
  const missing = [];
  if (!intitule) missing.push('intitule');
  if (coefficient === undefined || coefficient === null) missing.push('coefficient');
  if (!enseignantId) missing.push('enseignantId');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  const coef = Number(coefficient);
  if (isNaN(coef) || coef <= 0) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, 'Le coefficient doit être strictement positif');
  }

  if (await Matiere.findOne({ where: { intitule } })) {
    throw buildFault(FaultCodes.DOUBLON, `Une matière avec l'intitulé "${intitule}" existe déjà`);
  }

  await requireTeacher(enseignantId);

  const m = await Matiere.create({
    intitule,
    coefficient: coef,
    enseignantId, // UUID string, used as-is
  });

  const fresh = await Matiere.findByPk(m.id, { include: [{ model: User, as: 'enseignant' }] });
  return { matiere: toMatiere(fresh) };
}

/**
 * listerMatieres — BF6: list all subjects.
 */
async function listerMatieres() {
  const rows = await Matiere.findAll({
    include: [{ model: User, as: 'enseignant' }],
    order: [['id', 'ASC']],
  });
  // Wrapper pattern: { matieres: { matiere: [...] } }
  return { matieres: { matiere: rows.map(toMatiere) } };
}

/**
 * listerMesMatieres — BF8: list subjects assigned to the calling teacher.
 */
async function listerMesMatieres(userId) {
  const rows = await Matiere.findAll({
    where: { enseignantId: userId },
    include: [{ model: User, as: 'enseignant' }],
    order: [['id', 'ASC']],
  });
  // Wrapper pattern
  return { matieres: { matiere: rows.map(toMatiere) } };
}

/**
 * modifierMatiere — update a subject.
 * Authorization (passed via requestingUser):
 *   - administrateur  → may modify any field on any matiere
 *   - enseignant      → may modify intitule/coefficient on their own matieres only
 *                      (cannot change enseignantId — admin-only)
 */
async function modifierMatiere({ id, intitule, coefficient, enseignantId }, requestingUser) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const m = await Matiere.findByPk(id, { include: [{ model: User, as: 'enseignant' }] });
  if (!m) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucune matière avec l'id ${id}`);
  }

  // Authorization
  if (!requestingUser) {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Utilisateur non identifié');
  }
  if (requestingUser.role === 'enseignant') {
    // Teacher can only modify matieres they're responsible for
    if (String(m.enseignantId) !== String(requestingUser.id)) {
      throw buildFault(FaultCodes.ACCES_REFUSE, "Vous n'êtes pas l'enseignant responsable de cette matière");
    }
    // Teacher cannot reassign the matiere to another teacher
    if (enseignantId !== undefined && String(enseignantId) !== String(m.enseignantId)) {
      throw buildFault(FaultCodes.ACCES_REFUSE, "Seul l'administrateur peut changer l'enseignant responsable");
    }
  } else if (requestingUser.role !== 'administrateur') {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Accès non autorisé');
  }

  if (intitule && intitule !== m.intitule) {
    if (await Matiere.findOne({ where: { intitule } })) {
      throw buildFault(FaultCodes.DOUBLON, `Intitulé déjà utilisé: ${intitule}`);
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
    m.enseignantId = enseignantId; // UUID string
  }

  await m.save();
  // Re-fetch with the (possibly changed) teacher
  const fresh = await Matiere.findByPk(id, { include: [{ model: User, as: 'enseignant' }] });
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
  return { succes: true, message: `Matière #${id} supprimée` };
}

module.exports = {
  creerMatiere,
  listerMatieres,
  listerMesMatieres,
  modifierMatiere,
  supprimerMatiere,
  toMatiere,
};

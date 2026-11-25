// src/controllers/sectionsController.js
// CRUD for Section + Classe entities, and teacher/student assignments.
// All operations are admin-only (enforced in the service).

const { Section, Classe, User, Etudiant, EnseignantSection, EnseignantClasse } = require('../models');
const { buildFault, FaultCodes } = require('../utils/erreurs');

// ============================================================
// SECTION CRUD
// ============================================================

async function creerSection(args) {
  const { nom, description } = args || {};
  if (!nom) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['nom']);

  const exists = await Section.findOne({ where: { nom } });
  if (exists) throw buildFault(FaultCodes.DOUBLON, `Une section "${nom}" existe déjà`);

  const section = await Section.create({ nom, description: description || null });
  return { section: toSection(section) };
}

async function listerSections() {
  const sections = await Section.findAll({
    include: [{ model: Classe, as: 'classes' }],
    order: [['nom', 'ASC']],
  });
  return { sections: { section: sections.map(toSection) } };
}

async function modifierSection(args) {
  const { id, nom, description } = args || {};
  if (!id) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);

  const section = await Section.findByPk(id);
  if (!section) throw buildFault(FaultCodes.INTROUVABLE, `Section #${id} introuvable`);

  if (nom && nom !== section.nom) {
    const dup = await Section.findOne({ where: { nom } });
    if (dup) throw buildFault(FaultCodes.DOUBLON, `Une section "${nom}" existe déjà`);
    section.nom = nom;
  }
  if (description !== undefined) section.description = description || null;
  await section.save();
  return { section: toSection(section) };
}

async function supprimerSection(args) {
  const { id } = args || {};
  if (!id) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  const section = await Section.findByPk(id);
  if (!section) throw buildFault(FaultCodes.INTROUVABLE, `Section #${id} introuvable`);
  await section.destroy();
  return { succes: true, message: `Section "${section.nom}" supprimée` };
}

// ============================================================
// CLASSE CRUD
// ============================================================

async function creerClasse(args) {
  const { nom, sectionId } = args || {};
  const missing = [];
  if (!nom) missing.push('nom');
  if (!sectionId) missing.push('sectionId');
  if (missing.length) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);

  const section = await Section.findByPk(sectionId);
  if (!section) throw buildFault(FaultCodes.INTROUVABLE, `Section #${sectionId} introuvable`);

  const classe = await Classe.create({ nom, sectionId });
  const fresh = await Classe.findByPk(classe.id, { include: [{ model: Section, as: 'section' }] });
  return { classe: toClasse(fresh) };
}

async function listerClasses(args) {
  const where = {};
  if (args && args.sectionId) where.sectionId = args.sectionId;
  const classes = await Classe.findAll({
    where,
    include: [{ model: Section, as: 'section' }],
    order: [['nom', 'ASC']],
  });
  return { classes: { classe: classes.map(toClasse) } };
}

async function modifierClasse(args) {
  const { id, nom, sectionId } = args || {};
  if (!id) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);

  const classe = await Classe.findByPk(id);
  if (!classe) throw buildFault(FaultCodes.INTROUVABLE, `Classe #${id} introuvable`);

  if (sectionId && sectionId !== classe.sectionId) {
    const section = await Section.findByPk(sectionId);
    if (!section) throw buildFault(FaultCodes.INTROUVABLE, `Section #${sectionId} introuvable`);
    classe.sectionId = sectionId;
  }
  if (nom) classe.nom = nom;
  await classe.save();
  const fresh = await Classe.findByPk(id, { include: [{ model: Section, as: 'section' }] });
  return { classe: toClasse(fresh) };
}

async function supprimerClasse(args) {
  const { id } = args || {};
  if (!id) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  const classe = await Classe.findByPk(id);
  if (!classe) throw buildFault(FaultCodes.INTROUVABLE, `Classe #${id} introuvable`);
  await classe.destroy();
  return { succes: true, message: `Classe "${classe.nom}" supprimée` };
}

// ============================================================
// TEACHER ASSIGNMENTS
// ============================================================

/** Assign a teacher to one or more sections. */
async function assignerEnseignantSections(args) {
  const { userId, sectionIds } = args || {};
  const missing = [];
  if (!userId) missing.push('userId');
  if (!sectionIds || !sectionIds.length) missing.push('sectionIds');
  if (missing.length) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);

  const user = await User.findByPk(userId);
  if (!user) throw buildFault(FaultCodes.INTROUVABLE, `Utilisateur #${userId} introuvable`);
  if (user.role !== 'enseignant') throw buildFault(FaultCodes.VALEUR_INVALIDE, "L'utilisateur n'est pas un enseignant");

  // Replace all assignments for this teacher
  await EnseignantSection.destroy({ where: { userId } });
  const rows = sectionIds.map(sid => ({ userId, sectionId: sid }));
  await EnseignantSection.bulkCreate(rows);
  return { succes: true, message: `Enseignant assigné à ${sectionIds.length} section(s)` };
}

/** Assign a teacher to one or more classes. */
async function assignerEnseignantClasses(args) {
  const { userId, classeIds } = args || {};
  const missing = [];
  if (!userId) missing.push('userId');
  if (!classeIds || !classeIds.length) missing.push('classeIds');
  if (missing.length) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);

  const user = await User.findByPk(userId);
  if (!user) throw buildFault(FaultCodes.INTROUVABLE, `Utilisateur #${userId} introuvable`);
  if (user.role !== 'enseignant') throw buildFault(FaultCodes.VALEUR_INVALIDE, "L'utilisateur n'est pas un enseignant");

  await EnseignantClasse.destroy({ where: { userId } });
  const rows = classeIds.map(cid => ({ userId, classeId: cid }));
  await EnseignantClasse.bulkCreate(rows);
  return { succes: true, message: `Enseignant assigné à ${classeIds.length} classe(s)` };
}

/** List a teacher's assigned sections and classes. */
async function consulterAffectationsEnseignant(args) {
  const { userId } = args || {};
  if (!userId) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['userId']);

  const user = await User.findByPk(userId);
  if (!user) throw buildFault(FaultCodes.INTROUVABLE, `Utilisateur #${userId} introuvable`);

  const sections = await EnseignantSection.findAll({
    where: { userId },
    include: [{ model: Section, as: 'section' }],
  });
  const classes = await EnseignantClasse.findAll({
    where: { userId },
    include: [{ model: Classe, as: 'classe' }],
  });

  return {
    affectations: {
      sections: sections.map(s => toSection(s.section)).filter(Boolean),
      classes: classes.map(c => toClasse(c.classe)).filter(Boolean),
    },
  };
}

// ============================================================
// STUDENT ASSIGNMENT
// ============================================================

/** Assign a student to a section and classe. */
async function assignerEtudiantSection(args) {
  const { etudiantId, sectionId, classeId } = args || {};
  const missing = [];
  if (!etudiantId) missing.push('etudiantId');
  if (!sectionId) missing.push('sectionId');
  if (!classeId) missing.push('classeId');
  if (missing.length) throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);

  const etudiant = await Etudiant.findByPk(etudiantId);
  if (!etudiant) throw buildFault(FaultCodes.INTROUVABLE, `Étudiant #${etudiantId} introuvable`);

  const section = await Section.findByPk(sectionId);
  if (!section) throw buildFault(FaultCodes.INTROUVABLE, `Section #${sectionId} introuvable`);

  const classe = await Classe.findByPk(classeId);
  if (!classe) throw buildFault(FaultCodes.INTROUVABLE, `Classe #${classeId} introuvable`);

  if (classe.sectionId !== sectionId) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, `La classe "${classe.nom}" n'appartient pas à la section "${section.nom}"`);
  }

  etudiant.sectionId = sectionId;
  etudiant.classeId = classeId;
  await etudiant.save();

  // Also update the denormalized User.classe string for backward compat
  const user = await User.findByPk(etudiant.userId);
  if (user) {
    user.classe = classe.nom;
    await user.save();
  }

  return { succes: true, message: `Étudiant assigné à la section "${section.nom}" / classe "${classe.nom}"` };
}

// ============================================================
// SHAPERS
// ============================================================

function toSection(s) {
  if (!s) return null;
  const result = {
    id: s.id,
    nom: s.nom,
    description: s.description || '',
  };
  if (s.classes) {
    result.classes = s.classes.map(toClasse);
  }
  return result;
}

function toClasse(c) {
  if (!c) return null;
  const result = {
    id: c.id,
    nom: c.nom,
    sectionId: c.sectionId,
  };
  if (c.section) {
    result.sectionNom = c.section.nom;
  }
  return result;
}

module.exports = {
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
  toSection,
  toClasse,
};

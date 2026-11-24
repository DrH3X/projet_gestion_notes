// src/controllers/controleurEtudiants.js
// Sprint 3 — Service Étudiants (CRUD on student dossiers).
// A dossier = User (role=etudiant) + Etudiant academic record (1-1).

const { User, Etudiant } = require('../models');
const { hashPassword } = require('../utils/hachage');
const { buildFault, FaultCodes } = require('../utils/erreurs');

/**
 * Shape a Etudiant row (with its User) into the WSDL Dossier type.
 * All optional fields are included with empty strings when null — gives
 * the soap library a consistent item shape across the array.
 */
function toDossier(etudiant) {
  const u = etudiant.compte || etudiant.User || etudiant;
  return {
    id: etudiant.id,
    userId: etudiant.userId,
    nom: u.nom,
    prenom: u.prenom,
    email: u.email,
    classe: u.classe || '',
    matricule: etudiant.matricule,
    dateNaissance: etudiant.dateNaissance || '',
    adresse: etudiant.adresse || '',
  };
}

/**
 * creerDossier — creates a User with role='etudiant' + an Etudiant record.
 * Input:  { nom, prenom, email, motDePasse, classe, matricule, dateNaissance?, adresse? }
 * Output: { dossier }
 */
async function creerDossier(args) {
  const { nom, prenom, email, motDePasse, classe, matricule, dateNaissance, adresse } = args;

  // 1. Validate required fields
  const missing = [];
  if (!nom) missing.push('nom');
  if (!prenom) missing.push('prenom');
  if (!email) missing.push('email');
  if (!motDePasse) missing.push('motDePasse');
  if (!classe) missing.push('classe');
  if (!matricule) missing.push('matricule');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  // 2. Email + matricule uniqueness
  if (await User.findOne({ where: { email } })) {
    throw buildFault(FaultCodes.DOUBLON, `Email déjà utilisé: ${email}`);
  }
  if (await Etudiant.findOne({ where: { matricule } })) {
    throw buildFault(FaultCodes.DOUBLON, `Matricule déjà utilisé: ${matricule}`);
  }

  // 3. Create the user account (role forced to 'etudiant')
  const user = await User.create({
    nom,
    prenom,
    email,
    motDePasse: await hashPassword(motDePasse),
    role: 'etudiant',
    classe,
  });

  // 4. Create the academic dossier
  const etudiant = await Etudiant.create({
    userId: user.id,
    matricule,
    dateNaissance: dateNaissance || null,
    adresse: adresse || null,
  });

  // Reload with association so toDossier can use etudiant.compte
  const fresh = await Etudiant.findByPk(etudiant.id, { include: [{ model: User, as: 'compte' }] });
  return { dossier: toDossier(fresh) };
}

/**
 * listerDossiers — list all student dossiers (optionally filtered by classe).
 */
async function listerDossiers(args = {}) {
  const { classe } = args || {};
  const where = {};
  if (classe) {
    where['$compte.classe$'] = classe;
  }
  const rows = await Etudiant.findAll({
    where,
    include: [{ model: User, as: 'compte' }],
    order: [['id', 'ASC']],
  });
  // Wrapper pattern: { dossiers: { dossier: [...] } }
  return { dossiers: { dossier: rows.map(toDossier) } };
}

/**
 * consulterDossier — get one dossier by id.
 */
async function consulterDossier({ id }) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const etudiant = await Etudiant.findByPk(id, { include: [{ model: User, as: 'compte' }] });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier avec l'id ${id}`);
  }
  return { dossier: toDossier(etudiant) };
}

/**
 * consulterMonDossier — a student fetches their own dossier via JWT user.id.
 * Input:  userId (from JWT, passed by the service)
 * Output: { dossier }
 */
async function consulterMonDossier(userId) {
  if (!userId) {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Utilisateur non identifié');
  }
  const etudiant = await Etudiant.findOne({
    where: { userId },
    include: [{ model: User, as: 'compte' }],
  });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier étudiant pour l'utilisateur ${userId}`);
  }
  return { dossier: toDossier(etudiant) };
}

/**
 * listerMesEtudiants — BF9: a teacher lists all student dossiers (filterable by classe).
 * Input:  { classe? }
 * Output: { dossiers: { dossier: [...] } }
 */
async function listerMesEtudiants(args = {}) {
  const { classe } = args || {};
  return listerDossiers({ classe });
}

/**
 * modifierDossier — update a dossier (User fields + Etudiant fields).
 */
async function modifierDossier(args) {
  const { id, nom, prenom, email, classe, matricule, dateNaissance, adresse } = args;

  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }

  const etudiant = await Etudiant.findByPk(id, { include: [{ model: User, as: 'compte' }] });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier avec l'id ${id}`);
  }

  const user = etudiant.compte;

  // Email uniqueness (if changing)
  if (email && email !== user.email) {
    if (await User.findOne({ where: { email } })) {
      throw buildFault(FaultCodes.DOUBLON, `Email déjà utilisé: ${email}`);
    }
    user.email = email;
  }
  // Matricule uniqueness (if changing)
  if (matricule && matricule !== etudiant.matricule) {
    if (await Etudiant.findOne({ where: { matricule } })) {
      throw buildFault(FaultCodes.DOUBLON, `Matricule déjà utilisé: ${matricule}`);
    }
    etudiant.matricule = matricule;
  }

  if (nom) user.nom = nom;
  if (prenom) user.prenom = prenom;
  if (classe !== undefined) user.classe = classe || null;
  if (dateNaissance !== undefined) etudiant.dateNaissance = dateNaissance || null;
  if (adresse !== undefined) etudiant.adresse = adresse || null;

  await user.save();
  await etudiant.save();
  return { dossier: toDossier(etudiant) };
}

/**
 * supprimerDossier — delete a dossier + its user account.
 */
async function supprimerDossier({ id }) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }
  const etudiant = await Etudiant.findByPk(id, { include: [{ model: User, as: 'compte' }] });
  if (!etudiant) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun dossier avec l'id ${id}`);
  }
  const userId = etudiant.userId;
  await etudiant.destroy();
  await User.destroy({ where: { id: userId } });
  return { succes: true, message: `Dossier #${id} et compte associé supprimés` };
}

module.exports = {
  creerDossier,
  listerDossiers,
  consulterDossier,
  consulterMonDossier,
  listerMesEtudiants,
  modifierDossier,
  supprimerDossier,
  toDossier,
};

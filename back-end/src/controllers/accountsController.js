// src/controllers/accountsController.js
// Sprint 2 — Gestion des comptes (students + teachers)
// CRUD operations: creerCompte, listerComptes, modifierCompte, supprimerCompte
// All operations are restricted to role "administrateur" (enforced in the service).

const { User, Etudiant } = require('../models');
const { hashPassword } = require('../utils/hash');
const { buildFault, FaultCodes } = require('../utils/faults');

// Allowed roles for an account
const VALID_ROLES = ['administrateur', 'enseignant', 'etudiant'];

/**
 * Internal helper: shape a User row for the SOAP response.
 * Always includes classe (empty string when null) so every item in the
 * array has the same shape — the `soap` library serializes this reliably.
 */
function toCompte(user) {
  return {
    id: user.id,
    nom: user.nom,
    prenom: user.prenom,
    email: user.email,
    role: user.role,
    classe: user.classe || '',
  };
}

/**
 * creerCompte — BF1 (Créer les comptes des étudiants et des enseignants)
 * Input: { nom, prenom, email, motDePasse, role, classe?, dateNaissance?, adresse? }
 *
 * For role=etudiant, the Etudiant dossier is ALWAYS created alongside the
 * account. The matricule is ALWAYS auto-generated (ETU-<8 hex chars>) and
 * guaranteed unique — it is never accepted from the caller.
 * Output: { compte }
 */
async function creerCompte({ nom, prenom, email, motDePasse, role, classe, dateNaissance, adresse }) {
  // 1. Validate required fields (matricule is NOT accepted — auto-generated)
  const missing = [];
  if (!nom) missing.push('nom');
  if (!prenom) missing.push('prenom');
  if (!email) missing.push('email');
  if (!motDePasse) missing.push('motDePasse');
  if (!role) missing.push('role');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  // 2. Validate role value
  if (!VALID_ROLES.includes(role)) {
    throw buildFault(FaultCodes.VALEUR_INVALIDE, `Rôle invalide: ${role}. Valeurs attendues: ${VALID_ROLES.join(', ')}`);
  }

  // 3. Validate email uniqueness
  const exists = await User.findOne({ where: { email } });
  if (exists) {
    throw buildFault(FaultCodes.DOUBLON, `Un compte existe déjà avec l'email ${email}`);
  }

  // 4. Hash password + create the account
  const hashed = await hashPassword(motDePasse);
  const user = await User.create({
    nom,
    prenom,
    email,
    motDePasse: hashed,
    role,
    classe: classe || null,
  });

  // 5. For a student, ALWAYS create the academic dossier (Etudiant) with an
  //    auto-generated matricule. The matricule is never user-supplied.
  if (role === 'etudiant') {
    const finalMatricule = await generateUniqueMatricule();
    await Etudiant.create({
      userId: user.id,
      matricule: finalMatricule,
      dateNaissance: dateNaissance || null,
      adresse: adresse || null,
    });
  }

  return { compte: toCompte(user) };
}

/**
 * Generate a unique matricule of the form "ETU-<8 hex chars>".
 * Retries with a new value if a collision occurs (extremely unlikely).
 */
async function generateUniqueMatricule() {
  const { randomUUID } = require('crypto');
  for (let i = 0; i < 5; i++) {
    const candidate = 'ETU-' + randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase();
    const conflict = await Etudiant.findOne({ where: { matricule: candidate } });
    if (!conflict) return candidate;
  }
  // Fallback: include a timestamp to guarantee uniqueness.
  return 'ETU-' + Date.now().toString(36).toUpperCase();
}

/**
 * listerComptes — BF2 (Consulter la liste des étudiants et des enseignants)
 * Input: { role? } (optional filter)
 * Output: { comptes: [...] }
 */
async function listerComptes(args = {}) {
  const { role } = args || {};
  const where = {};
  if (role) {
    if (!VALID_ROLES.includes(role)) {
      throw buildFault(FaultCodes.VALEUR_INVALIDE, `Rôle invalide: ${role}`);
    }
    where.role = role;
  }

  const users = await User.findAll({
    where,
    order: [['id', 'ASC']],
    attributes: ['id', 'nom', 'prenom', 'email', 'role', 'classe'],
  });

  // Wrapper-element pattern: { comptes: { compte: [...] } }
  // produces <listerComptesResponse><comptes><compte/><compte/></comptes></listerComptesResponse>
  return { comptes: { compte: users.map(toCompte) } };
}

/**
 * modifierCompte — BF3 (Modifier les informations des étudiants et des enseignants)
 * Input: { id, nom?, prenom?, email?, classe?, motDePasse? }
 * Output: { compte }
 */
async function modifierCompte({ id, nom, prenom, email, classe, motDePasse }) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun compte avec l'id ${id}`);
  }

  // Validate new email uniqueness (if changing)
  if (email && email !== user.email) {
    const conflict = await User.findOne({ where: { email } });
    if (conflict) {
      throw buildFault(FaultCodes.DOUBLON, `Un compte existe déjà avec l'email ${email}`);
    }
    user.email = email;
  }

  if (nom) user.nom = nom;
  if (prenom) user.prenom = prenom;
  if (classe !== undefined) user.classe = classe || null;

  // Optional password reset
  if (motDePasse) {
    user.motDePasse = await hashPassword(motDePasse);
  }

  await user.save();
  return { compte: toCompte(user) };
}

/**
 * supprimerCompte — BF4 (Supprimer les comptes des étudiants et des enseignants)
 * Input: { id }
 * Output: { succes: true, message }
 */
async function supprimerCompte({ id }) {
  if (!id) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', ['id']);
  }

  const user = await User.findByPk(id);
  if (!user) {
    throw buildFault(FaultCodes.INTROUVABLE, `Aucun compte avec l'id ${id}`);
  }

  await user.destroy();
  return { succes: true, message: `Compte #${id} supprimé` };
}

module.exports = {
  creerCompte,
  listerComptes,
  modifierCompte,
  supprimerCompte,
  toCompte,
};

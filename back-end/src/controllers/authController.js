// src/controllers/authController.js
// Controller functions for the Authentication service (Sprint 1).
// Each function corresponds to one SOAP operation:
//   authUser   -> seConnecter
//   logoutUser -> seDeconnecter
// createUser is also provided as a helper (used for seeding and later sprints).

const { User } = require('../models');
const { hashPassword, comparePassword } = require('../utils/hash');
const { generateToken, verifyToken } = require('../utils/token');
const { buildFault, FaultCodes } = require('../utils/faults');

// Simple in-memory store for invalidated tokens (logout).
// In production use Redis or a DB-backed blacklist.
const tokenBlacklist = new Set();

/**
 * Create a new user (helper used by the seed script and Sprint 2).
 */
async function createUser({ nom, prenom, email, motDePasse, role, classe }) {
  const missing = [];
  if (!nom) missing.push('nom');
  if (!prenom) missing.push('prenom');
  if (!email) missing.push('email');
  if (!motDePasse) missing.push('motDePasse');
  if (!role) missing.push('role');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  const exists = await User.findOne({ where: { email } });
  if (exists) {
    throw buildFault(FaultCodes.DOUBLON, `Un compte existe déjà avec l'email ${email}`);
  }

  const hashed = await hashPassword(motDePasse);
  const user = await User.create({
    nom,
    prenom,
    email,
    motDePasse: hashed,
    role,
    classe: classe || null,
  });

  return user;
}

/**
 * Authenticate a user (seConnecter).
 * Input:  { email, motDePasse }
 * Output: { jeton, utilisateur: { id, nom, prenom, email, role } }
 */
async function authUser({ email, motDePasse }) {
  const missing = [];
  if (!email) missing.push('email');
  if (!motDePasse) missing.push('motDePasse');
  if (missing.length) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Champs obligatoires manquants', missing);
  }

  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw buildFault(FaultCodes.INTROUVABLE, 'Aucun compte associé à cet email');
  }

  const ok = await comparePassword(motDePasse, user.motDePasse);
  if (!ok) {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Identifiants invalides');
  }

  const jeton = generateToken(user);
  return {
    jeton,
    utilisateur: {
      id: user.id,
      nom: user.nom,
      prenom: user.prenom,
      email: user.email,
      role: user.role,
    },
  };
}

/**
 * Logout (seDeconnecter).
 * Input:  { jeton }
 * Output: { succes: true, message: 'Déconnexion réussie' }
 */
async function logoutUser({ jeton }) {
  if (!jeton) {
    throw buildFault(FaultCodes.CHAMP_MANQUANT, 'Jeton manquant', ['jeton']);
  }

  try {
    verifyToken(jeton);
  } catch (e) {
    throw buildFault(FaultCodes.ACCES_REFUSE, 'Jeton invalide ou expiré');
  }

  tokenBlacklist.add(jeton);
  return { succes: true, message: 'Déconnexion réussie' };
}

/**
 * Check whether a token has been blacklisted (used by middleware).
 */
function isBlacklisted(token) {
  return tokenBlacklist.has(token);
}

module.exports = {
  createUser,
  authUser,
  logoutUser,
  isBlacklisted,
};

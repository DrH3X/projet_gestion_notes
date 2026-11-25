// src/services/studentsService.js
// SOAP service object for the Students service (Sprint 3).
// RBAC:
//   creerDossier, listerDossiers, modifierDossier, supprimerDossier → admin only
//   consulterDossier → admin, enseignant, or self (étudiant viewing own dossier)

const controller = require('../controllers/controleurEtudiants');
const { extractUser } = require('../middleware/middlewareAuth');
const { buildFault, FaultCodes } = require('../utils/erreurs');

function requireAdmin(req) {
  const user = extractUser(req);
  if (!user) {
    return buildFault(FaultCodes.ACCES_REFUSE, 'Jeton manquant ou invalide');
  }
  if (user.role !== 'administrateur') {
    return buildFault(FaultCodes.ACCES_REFUSE, 'Accès réservé aux administrateurs');
  }
  return null;
}

function requireAuthenticated(req) {
  const user = extractUser(req);
  if (!user) {
    return buildFault(FaultCodes.ACCES_REFUSE, 'Jeton manquant ou invalide');
  }
  return user;
}

const studentsService = {
  ServiceEtudiants: {
    PortEtudiants: {
      creerDossier: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.creerDossier(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      listerDossiers: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.listerDossiers(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      consulterDossier: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller
          .consulterDossier(args)
          .then((r) => {
            // An etudiant can only see their own dossier.
            if (user.role === 'etudiant' && String(r.dossier.userId) !== String(user.id)) {
              return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Accès limité à votre propre dossier'));
            }
            cb(null, r);
          })
          .catch((e) => cb(e));
      },

      consulterMonDossier: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        if (user.role !== 'etudiant') {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux étudiants'));
        }
        controller
          .consulterMonDossier(user.id)
          .then((r) => cb(null, r))
          .catch((e) => cb(e));
      },

      listerMesEtudiants: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        if (user.role !== 'enseignant') {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux enseignants'));
        }
        controller.listerMesEtudiants(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      modifierDossier: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.modifierDossier(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      supprimerDossier: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.supprimerDossier(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },
    },
  },
};

module.exports = studentsService;

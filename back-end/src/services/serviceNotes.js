// src/services/serviceNotes.js
// SOAP service object for the Notes service (Sprint 4).
// RBAC:
//   saisirNote, modifierNote, supprimerNote    → enseignant (responsable de la matière) ou admin
//   consulterNotesEnseignant, consulterMoyennesClasse → enseignant (ses matières) ou admin
//   consulterMesNotes, consulterMonBilan       → étudiant (lui-même, id pris du JWT)

const controller = require('../controllers/controleurNotes');
const { extractUser } = require('../middleware/middlewareAuth');
const { buildFault, FaultCodes } = require('../utils/erreurs');

function requireAuthenticated(req) {
  const user = extractUser(req);
  if (!user) {
    return buildFault(FaultCodes.ACCES_REFUSE, 'Jeton manquant ou invalide');
  }
  return user;
}

const notesService = {
  ServiceNotes: {
    PortNotes: {
      saisirNote: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.saisirNote(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      modifierNote: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.modifierNote(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      supprimerNote: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.supprimerNote(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      consulterNotesEnseignant: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.consulterNotesEnseignant(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      consulterMoyennesClasse: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.consulterMoyennesClasse(args, user).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      consulterMesNotes: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        if (user.role !== 'etudiant') {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux étudiants'));
        }
        controller.consulterMesNotes(user.id).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      consulterMonBilan: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        if (user.role !== 'etudiant') {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux étudiants'));
        }
        controller.consulterMonBilan(user.id).then((r) => cb(null, r)).catch((e) => cb(e));
      },
    },
  },
};

module.exports = notesService;

// src/services/subjectsService.js
// SOAP service object for the Subjects (Matières) service (Sprint 3).
// RBAC:
//   creerMatiere, modifierMatiere, supprimerMatiere → admin only
//   listerMatieres → any authenticated user
//   listerMesMatieres → enseignant only

const controller = require('../controllers/controleurMatieres');
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

const subjectsService = {
  ServiceMatieres: {
    PortMatieres: {
      creerMatiere: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.creerMatiere(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      listerMatieres: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller.listerMatieres().then((r) => cb(null, r)).catch((e) => cb(e));
      },

      listerMesMatieres: function (args, cb, headers, req) {
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        if (user.role !== 'enseignant') {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Réservé aux enseignants'));
        }
        controller.listerMesMatieres(user.id).then((r) => cb(null, r)).catch((e) => cb(e));
      },

      modifierMatiere: function (args, cb, headers, req) {
        // Authorization is checked inside the controller (admin OR responsible teacher).
        const user = requireAuthenticated(req);
        if (user?.Fault) return cb(user);
        controller
          .modifierMatiere(args, user)
          .then((r) => cb(null, r))
          .catch((e) => cb(e));
      },

      supprimerMatiere: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller.supprimerMatiere(args).then((r) => cb(null, r)).catch((e) => cb(e));
      },
    },
  },
};

module.exports = subjectsService;

// src/services/serviceComptes.js
// SOAP service object for the Accounts service (Sprint 2).
// RBAC: all operations require role "administrateur" via extractUser(req).

const controller = require('../controllers/controleurComptes');
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

const accountsService = {
  ServiceComptes: {
    PortComptes: {
      creerCompte: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller
          .creerCompte(args)
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },

      listerComptes: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller
          .listerComptes(args)
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },

      modifierCompte: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller
          .modifierCompte(args)
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },

      supprimerCompte: function (args, cb, headers, req) {
        const fault = requireAdmin(req);
        if (fault) return cb(fault);
        controller
          .supprimerCompte(args)
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },
    },
  },
};

module.exports = accountsService;

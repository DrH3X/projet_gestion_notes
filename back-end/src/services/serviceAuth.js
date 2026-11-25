// src/services/authService.js
// SOAP service object: maps WSDL operations -> controller functions.
// The `soap` library calls these methods when a SOAP request arrives.

const controller = require('../controllers/controleurAuth');

const authService = {
  ServiceAuthentification: {
    PortAuthentification: {
      // seConnecter(args, callback)
      seConnecter: function (args, cb) {
        controller
          .authUser({ email: args.email, motDePasse: args.motDePasse })
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },

      // seDeconnecter(args, callback)
      seDeconnecter: function (args, cb) {
        controller
          .logoutUser({ jeton: args.jeton })
          .then((result) => cb(null, result))
          .catch((err) => cb(err));
      },
    },
  },
};

module.exports = authService;

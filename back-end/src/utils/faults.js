// src/utils/faults.js
// SOAP fault helper - throws a structured error that the soap library
// turns into a SOAP <Fault> response.

/**
 * Build a SOAP Fault error.
 * @param {string} code    - machine-readable fault code
 * @param {string} message - human-readable message
 * @param {string[]} [champsManquants] - list of missing fields (400)
 */
function buildFault(code, message, champsManquants) {
  const detail = {
    code,
    message,
  };
  if (champsManquants && champsManquants.length) {
    detail.champsManquants = champsManquants;
  }

  const err = new Error(message);
  err.Fault = {
    Code: { Value: 'SOAP-ENV:Server', Subcode: { Value: code } },
    Reason: { Text: message },
    Detail: detail,
  };
  return err;
}

// Common fault codes from the spec
const FaultCodes = {
  CHAMP_MANQUANT: 'CHAMP_MANQUANT',
  VALEUR_INVALIDE: 'VALEUR_INVALIDE',
  ACCES_REFUSE: 'ACCES_REFUSE',
  DOUBLON: 'DOUBLON',
  INTROUVABLE: 'INTROUVABLE',
};

module.exports = { buildFault, FaultCodes };

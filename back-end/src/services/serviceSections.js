// src/services/sectionsService.js
// SOAP service object for the Sections/Classes service.
// RBAC: all operations require admin role (except consulterAffectationsEnseignant
// which is available to the teacher themselves or admin).

const controller = require('../controllers/controleurSections');
const { extractUser } = require('../middleware/middlewareAuth');
const { buildFault, FaultCodes } = require('../utils/erreurs');

function requireAdmin(req) {
  const user = extractUser(req);
  if (!user) return buildFault(FaultCodes.ACCES_REFUSE, 'Jeton manquant ou invalide');
  if (user.role !== 'administrateur') return buildFault(FaultCodes.ACCES_REFUSE, 'Accès réservé aux administrateurs');
  return null;
}

function requireAuth(req) {
  const user = extractUser(req);
  if (!user) return buildFault(FaultCodes.ACCES_REFUSE, 'Jeton manquant ou invalide');
  return user;
}

// Helper: the SOAP lib passes sectionIds as { uuid: [...] } or { uuid: "..." }
// Normalize to a flat array of strings.
function normalizeUuidList(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') return [v];
  if (typeof v === 'object') {
    const uuids = v.uuid || v.sectionId || v.classeId;
    if (Array.isArray(uuids)) return uuids;
    if (uuids) return [uuids];
  }
  return [];
}

const sectionsService = {
  ServiceSections: {
    PortSections: {
      creerSection: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.creerSection(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      listerSections: function (args, cb, headers, req) {
        const u = requireAuth(req);
        if (u?.Fault) return cb(u);
        controller.listerSections().then(r => cb(null, r)).catch(e => cb(e));
      },
      modifierSection: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.modifierSection(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      supprimerSection: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.supprimerSection(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      creerClasse: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.creerClasse(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      listerClasses: function (args, cb, headers, req) {
        const u = requireAuth(req);
        if (u?.Fault) return cb(u);
        controller.listerClasses(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      modifierClasse: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.modifierClasse(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      supprimerClasse: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.supprimerClasse(args).then(r => cb(null, r)).catch(e => cb(e));
      },
      assignerEnseignantSections: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        const normalized = { ...args, sectionIds: normalizeUuidList(args?.sectionIds) };
        controller.assignerEnseignantSections(normalized).then(r => cb(null, r)).catch(e => cb(e));
      },
      assignerEnseignantClasses: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        const normalized = { ...args, classeIds: normalizeUuidList(args?.classeIds) };
        controller.assignerEnseignantClasses(normalized).then(r => cb(null, r)).catch(e => cb(e));
      },
      consulterAffectationsEnseignant: function (args, cb, headers, req) {
        const user = requireAuth(req);
        if (user?.Fault) return cb(user);
        // Admin can query any teacher; a teacher can query their own
        const targetUserId = args?.userId || user.id;
        if (user.role === 'enseignant' && targetUserId !== user.id) {
          return cb(buildFault(FaultCodes.ACCES_REFUSE, 'Un enseignant ne peut consulter que ses propres affectations'));
        }
        controller.consulterAffectationsEnseignant({ userId: targetUserId }).then(r => cb(null, r)).catch(e => cb(e));
      },
      assignerEtudiantSection: function (args, cb, headers, req) {
        const f = requireAdmin(req);
        if (f) return cb(f);
        controller.assignerEtudiantSection(args).then(r => cb(null, r)).catch(e => cb(e));
      },
    },
  },
};

module.exports = sectionsService;

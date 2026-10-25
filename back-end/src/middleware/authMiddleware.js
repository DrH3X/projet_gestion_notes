// src/middleware/authMiddleware.js
// Reusable role-based access control middleware.
// Used by all SOAP services (auth + future sprints) to enforce RBAC.

const { verifyToken } = require('../utils/token');
const { isBlacklisted } = require('../controllers/authController');

/**
 * Extract the JWT from an HTTP request and return the decoded user
 * (or null if missing/invalid). Used by SOAP service functions that
 * receive the Express `req` object as their 4th argument.
 */
function extractUser(req) {
  if (!req || !req.headers) return null;
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  if (isBlacklisted(token)) return null;
  try {
    return verifyToken(token);
  } catch (e) {
    return null;
  }
}

/**
 * Express middleware that extracts the Bearer token from the
 * Authorization header and verifies it. Attaches `req.user`.
 */
function authenticate(req, res, next) {
  const user = extractUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Jeton manquant, invalide ou révoqué' });
  }
  req.user = user;
  next();
}

/**
 * Factory: returns a middleware that only allows the given roles.
 * Usage: router.get('/x', authenticate, requireRole('administrateur'), handler)
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Non authentifié' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Accès refusé pour votre rôle' });
    }
    next();
  };
}

module.exports = { extractUser, authenticate, requireRole };

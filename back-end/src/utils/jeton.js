// src/utils/token.js
// JWT generation and verification

const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'dev_secret';
const EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

/**
 * Generate a signed JWT containing the user id, role and email.
 */
function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    SECRET,
    { expiresIn: EXPIRES_IN }
  );
}

/**
 * Verify a token. Returns the decoded payload or throws.
 */
function verifyToken(token) {
  return jwt.verify(token, SECRET);
}

module.exports = { generateToken, verifyToken };

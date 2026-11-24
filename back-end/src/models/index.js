// src/models/index.js
// Central export point for all Sequelize models.

const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Etudiant = require('./etudiant');
const Matiere = require('./matiere');
const Note = require('./note');

module.exports = {
  sequelize,
  User,
  Etudiant,
  Matiere,
  Note,
};

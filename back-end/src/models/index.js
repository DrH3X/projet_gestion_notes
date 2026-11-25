// src/models/index.js
// Central export point for all Sequelize models.

const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Etudiant = require('./etudiant');
const Matiere = require('./matiere');
const Note = require('./note');
const Section = require('./section');
const Classe = require('./classe');
const { EnseignantSection, EnseignantClasse } = require('./affectations');

module.exports = {
  sequelize,
  User,
  Etudiant,
  Matiere,
  Note,
  Section,
  Classe,
  EnseignantSection,
  EnseignantClasse,
};

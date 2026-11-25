// src/models/matiere.js
// Matière (subject) with a teacher in charge, assigned to a section + classe.
// A matière like "Mathématiques" can exist in multiple classes (e.g., GLSI 1ère année
// and GLSI 2ème année), each with its own teacher and coefficient.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Section = require('./section');
const Classe = require('./classe');

const Matiere = sequelize.define(
  'Matiere',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    intitule: {
      type: DataTypes.STRING(150),
      allowNull: false,
      // unique constraint removed: same name can exist in different classes
    },
    coefficient: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0.01 },
    },
    enseignantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'enseignantId',
      references: { model: User, key: 'id' },
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sectionId',
      references: { model: Section, key: 'id' },
    },
    classeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'classeId',
      references: { model: Classe, key: 'id' },
    },
  },
  {
    tableName: 'matieres',
    timestamps: true,
    indexes: [
      // Unique per (intitule, classeId) — same name allowed in different classes
      { unique: true, fields: ['intitule', 'classeId'] },
    ],
  }
);

// Associations
User.hasMany(Matiere, { foreignKey: 'enseignantId', as: 'matieres' });
Matiere.belongsTo(User, { foreignKey: 'enseignantId', as: 'enseignant' });
Matiere.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Matiere.belongsTo(Classe, { foreignKey: 'classeId', as: 'classeObj' });

module.exports = Matiere;

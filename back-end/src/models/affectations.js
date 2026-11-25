// src/models/affectations.js
// Junction models for teacher ↔ section/classe assignments (many-to-many).
// An admin assigns a teacher to one or more sections and/or classes.
// This determines which students the teacher can see (BF9).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Section = require('./section');
const Classe = require('./classe');

// Teacher ↔ Section (many-to-many)
const EnseignantSection = sequelize.define(
  'EnseignantSection',
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'userId',
      references: { model: User, key: 'id' },
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'sectionId',
      references: { model: Section, key: 'id' },
    },
  },
  { tableName: 'enseignant_sections', timestamps: true }
);

// Teacher ↔ Classe (many-to-many)
const EnseignantClasse = sequelize.define(
  'EnseignantClasse',
  {
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'userId',
      references: { model: User, key: 'id' },
    },
    classeId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      field: 'classeId',
      references: { model: Classe, key: 'id' },
    },
  },
  { tableName: 'enseignant_classes', timestamps: true }
);

// Associations
// Explicit belongsTo on the through models (needed for include queries)
EnseignantSection.belongsTo(User, { foreignKey: 'userId', as: 'user' });
EnseignantSection.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
EnseignantClasse.belongsTo(User, { foreignKey: 'userId', as: 'user' });
EnseignantClasse.belongsTo(Classe, { foreignKey: 'classeId', as: 'classe' });

// Many-to-many through
User.belongsToMany(Section, {
  through: EnseignantSection,
  foreignKey: 'userId',
  otherKey: 'sectionId',
  as: 'sectionsEnseignant',
});
Section.belongsToMany(User, {
  through: EnseignantSection,
  foreignKey: 'sectionId',
  otherKey: 'userId',
  as: 'enseignants',
});

User.belongsToMany(Classe, {
  through: EnseignantClasse,
  foreignKey: 'userId',
  otherKey: 'classeId',
  as: 'classesEnseignant',
});
Classe.belongsToMany(User, {
  through: EnseignantClasse,
  foreignKey: 'classeId',
  otherKey: 'userId',
  as: 'enseignants',
});

module.exports = { EnseignantSection, EnseignantClasse };

// src/models/classe.js
// Classe (cohorte) — e.g. "1A Info", "2A Info". Appartient à une Section.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');
const Section = require('./section');

const Classe = sequelize.define(
  'Classe',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    sectionId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'sectionId',
      references: { model: Section, key: 'id' },
    },
  },
  {
    tableName: 'classes',
    timestamps: true,
  }
);

// Associations
Section.hasMany(Classe, { foreignKey: 'sectionId', as: 'classes' });
Classe.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });

module.exports = Classe;

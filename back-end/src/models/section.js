// src/models/section.js
// Section académique (filière) — e.g. "Informatique", "Réseaux", "Mécatronique".
// Une Section contient plusieurs Classes.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');

const Section = sequelize.define(
  'Section',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    nom: {
      type: DataTypes.STRING(100),
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
  },
  {
    tableName: 'sections',
    timestamps: true,
  }
);

module.exports = Section;

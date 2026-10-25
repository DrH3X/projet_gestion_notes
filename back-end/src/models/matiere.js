// src/models/matiere.js
// Sprint 3 — Matière (subject) with a teacher in charge.
// UUID primary key + UUID foreign key to users.id (the enseignant).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

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
      unique: true,
    },
    coefficient: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0.01 }, // strictly positive
    },
    enseignantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'enseignantId',
      references: { model: User, key: 'id' },
    },
  },
  {
    tableName: 'matieres',
    timestamps: true,
  }
);

// A teacher (User role=enseignant) can be in charge of many subjects.
User.hasMany(Matiere, { foreignKey: 'enseignantId', as: 'matieres' });
Matiere.belongsTo(User, { foreignKey: 'enseignantId', as: 'enseignant' });

module.exports = Matiere;

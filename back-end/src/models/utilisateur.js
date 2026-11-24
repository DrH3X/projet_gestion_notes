// src/models/user.js
// Sequelize model for the User table (auth + accounts, Sprint 1 + 2).
// Primary key is a UUID v4 (not an incremental integer).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');

const User = sequelize.define(
  'User',
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
    prenom: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(150),
      allowNull: false,
      unique: true,
      validate: { isEmail: true },
    },
    motDePasse: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    role: {
      type: DataTypes.ENUM('administrateur', 'enseignant', 'etudiant'),
      allowNull: false,
    },
    classe: {
      type: DataTypes.STRING(50),
      allowNull: true, // only for students
    },
  },
  {
    tableName: 'users',
    timestamps: true,
  }
);

module.exports = User;

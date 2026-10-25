// src/models/etudiant.js
// Sprint 3 — Dossier étudiant (1-1 with a User of role 'etudiant').
// Holds the academic profile that goes beyond the login account.
// UUID primary key + UUID foreign key to users.id.

const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

const Etudiant = sequelize.define(
  'Etudiant',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'userId',
      references: { model: User, key: 'id' },
    },
    matricule: {
      type: DataTypes.STRING(50),
      allowNull: false,
      unique: true,
    },
    dateNaissance: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    adresse: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: 'etudiants',
    timestamps: true,
  }
);

// 1-1: a User (role=etudiant) has exactly one Etudiant dossier.
User.hasOne(Etudiant, { foreignKey: 'userId' });
Etudiant.belongsTo(User, { foreignKey: 'userId', as: 'compte' });

module.exports = Etudiant;

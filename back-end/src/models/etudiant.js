// src/models/etudiant.js
// Dossier étudiant (1-1 with a User of role 'etudiant').
// Holds the academic profile: matricule, dateNaissance, adresse,
// and the assigned Section + Classe (academic track + cohort).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Section = require('./section');
const Classe = require('./classe');

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
    sectionId: {
      type: DataTypes.UUID,
      allowNull: true, // can be null initially, set by admin
      field: 'sectionId',
      references: { model: Section, key: 'id' },
    },
    classeId: {
      type: DataTypes.UUID,
      allowNull: true, // can be null initially, set by admin
      field: 'classeId',
      references: { model: Classe, key: 'id' },
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

// Etudiant → Section + Classe
Etudiant.belongsTo(Section, { foreignKey: 'sectionId', as: 'section' });
Etudiant.belongsTo(Classe, { foreignKey: 'classeId', as: 'classeObj' });

module.exports = Etudiant;

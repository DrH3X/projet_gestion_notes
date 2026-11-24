// src/models/note.js
// Sprint 4 — Note (a grade given to a student for a subject).
// - valeur: 0..20 (validated strictly)
// - type: 'DS' | 'examen' | 'TP'
// - etudiantId -> Etudiant.id, matiereId -> Matiere.id
// A (etudiant, matiere, type) triple is unique (one DS / one examen / one TP per subject).

const { DataTypes } = require('sequelize');
const sequelize = require('../config/base-donnees');
const User = require('./utilisateur');
const Etudiant = require('./etudiant');
const Matiere = require('./matiere');

const Note = sequelize.define(
  'Note',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
    },
    etudiantId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'etudiantId',
      references: { model: Etudiant, key: 'id' },
    },
    matiereId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'matiereId',
      references: { model: Matiere, key: 'id' },
    },
    valeur: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: { min: 0, max: 20 },
    },
    type: {
      // SQLite stores ENUM as TEXT with a CHECK-like validation at the app level.
      type: DataTypes.ENUM('DS', 'examen', 'TP'),
      allowNull: false,
    },
  },
  {
    tableName: 'notes',
    timestamps: true,
    indexes: [
      // one note per (etudiant, matiere, type)
      { unique: true, fields: ['etudiantId', 'matiereId', 'type'] },
    ],
  }
);

// Associations
// An Etudiant has many notes; a Matiere has many notes.
Etudiant.hasMany(Note, { foreignKey: 'etudiantId', as: 'notes' });
Note.belongsTo(Etudiant, { foreignKey: 'etudiantId', as: 'etudiant' });
Matiere.hasMany(Note, { foreignKey: 'matiereId', as: 'notes' });
Note.belongsTo(Matiere, { foreignKey: 'matiereId', as: 'matiere' });

module.exports = Note;

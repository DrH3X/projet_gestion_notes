// src/routes/routesRest.js
// Convenience REST endpoints (mirror of the SOAP operations).
//
// Auth:       /api/auth/*
// Accounts:   /api/accounts/*    (admin only)
// Students:   /api/students/*    (admin only — except consulter)
// Subjects:   /api/subjects/*    (admin for write, authenticated for read)
// Notes:      /api/notes/*       (Sprint 4)

const express = require('express');
const router = express.Router();

const authController = require('../controllers/controleurAuth');
const accountsController = require('../controllers/controleurComptes');
const studentsController = require('../controllers/controleurEtudiants');
const subjectsController = require('../controllers/controleurMatieres');
const notesController = require('../controllers/controleurNotes');
const { authenticate, requireRole } = require('../middleware/middlewareAuth');

// ============================================================
// /api/auth/*
// ============================================================

router.post('/auth/login', async (req, res) => {
  try {
    res.json(await authController.authUser(req.body));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

router.post('/auth/logout', async (req, res) => {
  try {
    res.json(await authController.logoutUser({ jeton: req.body.jeton }));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
    });
  }
});

router.get('/auth/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// ============================================================
// /api/accounts/*  (admin only)  — Sprint 2
// ============================================================

router.use('/accounts', authenticate, requireRole('administrateur'));

router.post('/accounts', async (req, res) => {
  try {
    res.status(201).json(await accountsController.creerCompte(req.body));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

router.get('/accounts', async (req, res) => {
  try {
    res.json(await accountsController.listerComptes({ role: req.query.role }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

router.get('/accounts/:id', async (req, res) => {
  try {
    const { User } = require('../models');
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'nom', 'prenom', 'email', 'role', 'classe'],
    });
    if (!user) return res.status(404).json({ code: 'INTROUVABLE', message: 'Compte introuvable' });
    res.json({ compte: accountsController.toCompte(user) });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

router.put('/accounts/:id', async (req, res) => {
  try {
    res.json(await accountsController.modifierCompte({ id: req.params.id, ...req.body }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

router.delete('/accounts/:id', async (req, res) => {
  try {
    res.json(await accountsController.supprimerCompte({ id: req.params.id }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// ============================================================
// /api/students/*  — Sprint 3
//   Write ops (create/update/delete/list) → admin only
//   consulter → admin, enseignant, or self
// ============================================================

// GET /api/students?classe=...  → admin only (full listing)
router.get('/students', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.json(await studentsController.listerDossiers({ classe: req.query.classe }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// POST /api/students → admin only
router.post('/students', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.status(201).json(await studentsController.creerDossier(req.body));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

// GET /api/students/me → etudiant only (own dossier via JWT)
router.get('/students/me', authenticate, requireRole('etudiant'), async (req, res) => {
  try {
    res.json(await studentsController.consulterMonDossier(req.user.id));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/students/teacher-view?classe=... → enseignant only (BF9 — list all dossiers)
router.get('/students/teacher-view', authenticate, requireRole('enseignant'), async (req, res) => {
  try {
    res.json(await studentsController.listerMesEtudiants({ classe: req.query.classe }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/students/:id → admin, enseignant, or self
router.get('/students/:id', authenticate, async (req, res) => {
  try {
    const result = await studentsController.consulterDossier({ id: req.params.id });
    if (req.user.role === 'etudiant' && String(result.dossier.userId) !== String(req.user.id)) {
      return res.status(403).json({ code: 'ACCES_REFUSE', message: 'Accès limité à votre propre dossier' });
    }
    res.json(result);
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// PUT /api/students/:id → admin only
router.put('/students/:id', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.json(await studentsController.modifierDossier({ id: req.params.id, ...req.body }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// DELETE /api/students/:id → admin only
router.delete('/students/:id', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.json(await studentsController.supprimerDossier({ id: req.params.id }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// ============================================================
// /api/subjects/*  — Sprint 3
//   listerMatieres → any authenticated
//   listerMesMatieres → enseignant only
//   write ops → admin only
// ============================================================

// GET /api/subjects → any authenticated
router.get('/subjects', authenticate, async (req, res) => {
  try {
    res.json(await subjectsController.listerMatieres());
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/subjects/me → enseignant only (BF8)
router.get('/subjects/me', authenticate, requireRole('enseignant'), async (req, res) => {
  try {
    res.json(await subjectsController.listerMesMatieres(req.user.id));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// POST /api/subjects → admin only (BF5)
router.post('/subjects', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.status(201).json(await subjectsController.creerMatiere(req.body));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

// PUT /api/subjects/:id → admin OR responsible teacher (authz in controller)
router.put('/subjects/:id', authenticate, async (req, res) => {
  try {
    res.json(await subjectsController.modifierMatiere({ id: req.params.id, ...req.body }, req.user));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// DELETE /api/subjects/:id → admin only
router.delete('/subjects/:id', authenticate, requireRole('administrateur'), async (req, res) => {
  try {
    res.json(await subjectsController.supprimerMatiere({ id: req.params.id }));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// ============================================================
// /api/notes/*  — Sprint 4
//   saisir/modifier/supprimer            → enseignant (responsable) ou admin
//   consulterNotesEnseignant, moyennes   → enseignant (ses matières) ou admin
//   consulterMesNotes, consulterMonBilan → étudiant (lui-même)
// ============================================================

// GET /api/notes/teacher?matiereId=…&etudiantId=… → enseignant/admin (BF12)
router.get('/notes/teacher', authenticate, requireRole('enseignant', 'administrateur'), async (req, res) => {
  try {
    res.json(await notesController.consulterNotesEnseignant(
      { matiereId: req.query.matiereId, etudiantId: req.query.etudiantId },
      req.user,
    ));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/notes/moyennes?classe=… → enseignant/admin (BF13)
router.get('/notes/moyennes', authenticate, requireRole('enseignant', 'administrateur'), async (req, res) => {
  try {
    res.json(await notesController.consulterMoyennesClasse({ classe: req.query.classe }, req.user));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/notes/me → étudiant (BF15)
router.get('/notes/me', authenticate, requireRole('etudiant'), async (req, res) => {
  try {
    res.json(await notesController.consulterMesNotes(req.user.id));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// GET /api/notes/me/bilan → étudiant (BF16, BF17, BF18)
router.get('/notes/me/bilan', authenticate, requireRole('etudiant'), async (req, res) => {
  try {
    res.json(await notesController.consulterMonBilan(req.user.id));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

// POST /api/notes → enseignant/admin (BF10)
router.post('/notes', authenticate, requireRole('enseignant', 'administrateur'), async (req, res) => {
  try {
    res.status(201).json(await notesController.saisirNote(req.body, req.user));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

// PUT /api/notes/:id → enseignant/admin (BF11)
router.put('/notes/:id', authenticate, requireRole('enseignant', 'administrateur'), async (req, res) => {
  try {
    res.json(await notesController.modifierNote({ id: req.params.id, ...req.body }, req.user));
  } catch (err) {
    res.status(400).json({
      code: err.Fault?.Detail?.code || 'ERREUR',
      message: err.message,
      champsManquants: err.Fault?.Detail?.champsManquants || [],
    });
  }
});

// DELETE /api/notes/:id → enseignant/admin
router.delete('/notes/:id', authenticate, requireRole('enseignant', 'administrateur'), async (req, res) => {
  try {
    res.json(await notesController.supprimerNote({ id: req.params.id }, req.user));
  } catch (err) {
    res.status(400).json({ code: err.Fault?.Detail?.code || 'ERREUR', message: err.message });
  }
});

module.exports = router;

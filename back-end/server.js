// server.js
// SOAP backend (Sprints 1, 2, 3, 4) — production-ready.
//
// Configuration via environment variables (see .env.example):
//   PORT            – HTTP port (default 3001)
//   CORS_ORIGIN     – allowed frontend origin (default * for dev)
//   DB_DIALECT      – 'sqlite' (default) or 'postgres'
//   DB_FILE         – SQLite file path (sqlite only)
//   DB_HOST/PORT/USER/PASSWORD/NAME – PostgreSQL connection
//   JWT_SECRET      – JWT signing secret
//   JWT_EXPIRES_IN  – token lifetime (default 8h)
//
// Storage: SQLite by default, switchable to PostgreSQL via DB_DIALECT=postgres.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { sequelize, User, Etudiant, Matiere, Note } = require('./src/models');
const { attachSoapService } = require('./src/routes/soapRoutes');
const restRoutes = require('./src/routes/restRoutes');
const { hashPassword } = require('./src/utils/hash');

const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Ensure the SQLite data directory exists (file-based storage).
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();

// Middleware
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST convenience mirror (handy for curl / debugging)
app.use('/api', restRoutes);

// Health check
app.get('/', (req, res) => {
  const base = `http://localhost:${PORT}`;
  res.json({
    service: 'Scolarité SOAP',
    sprints: ['1 — Authentification', '2 — Gestion des comptes', '3 — Étudiants & Matières', '4 — Notes & Moyennes'],
    status: 'running',
    wsdl: {
      auth: `${base}/wsdl?wsdl`,
      accounts: `${base}/wsdl/accounts?wsdl`,
      students: `${base}/wsdl/students?wsdl`,
      subjects: `${base}/wsdl/subjects?wsdl`,
      notes: `${base}/wsdl/notes?wsdl`,
    },
  });
});

// Attach the SOAP services
attachSoapService(app);

// Demo data (mirrors db/seed.js)
const demoAccounts = [
  { nom: 'Admin', prenom: 'Scolarite', email: 'admin@scolarite.com', motDePasse: 'admin123', role: 'administrateur', classe: null },
  { nom: 'Ben Ali', prenom: 'Mohamed', email: 'enseignant@scolarite.com', motDePasse: 'enseignant123', role: 'enseignant', classe: null },
  { nom: 'Gharbi', prenom: 'Sami', email: 'etudiant@scolarite.com', motDePasse: 'etudiant123', role: 'etudiant', classe: '3A' },
];
const demoDossiers = [
  { email: 'etudiant@scolarite.com', matricule: 'ETU-001', dateNaissance: '2002-05-14', adresse: 'Tunis' },
];
const demoMatieres = [
  { intitule: 'Algorithmique', coefficient: 3, enseignantEmail: 'enseignant@scolarite.com' },
  { intitule: 'Bases de données', coefficient: 4, enseignantEmail: 'enseignant@scolarite.com' },
];

// Demo notes — Sprint 4 (seeded for the demo student on the 2 demo matières).
// Notes chosen so the weighted moyenne is exactly 13.0:
//   Algorithmique (coef 3): DS=12, examen=14, TP=13 → moy matiere = 13
//   Bases de données (coef 4): DS=11, examen=15, TP=13 → moy matiere = 13
//   moyenne generale = (13×3 + 13×4) / (3+4) = 13 → mention "assez_bien", statut "admis"
const demoNotes = [
  { matiereIntitule: 'Algorithmique', etudiantEmail: 'etudiant@scolarite.com', type: 'DS', valeur: 12 },
  { matiereIntitule: 'Algorithmique', etudiantEmail: 'etudiant@scolarite.com', type: 'examen', valeur: 14 },
  { matiereIntitule: 'Algorithmique', etudiantEmail: 'etudiant@scolarite.com', type: 'TP', valeur: 13 },
  { matiereIntitule: 'Bases de données', etudiantEmail: 'etudiant@scolarite.com', type: 'DS', valeur: 11 },
  { matiereIntitule: 'Bases de données', etudiantEmail: 'etudiant@scolarite.com', type: 'examen', valeur: 15 },
  { matiereIntitule: 'Bases de données', etudiantEmail: 'etudiant@scolarite.com', type: 'TP', valeur: 13 },
];

async function seedDemoData() {
  // 1. Accounts
  for (const u of demoAccounts) {
    const exists = await User.findOne({ where: { email: u.email } });
    if (exists) continue;
    await User.create({
      nom: u.nom, prenom: u.prenom, email: u.email,
      motDePasse: await hashPassword(u.motDePasse),
      role: u.role, classe: u.classe,
    });
    console.log(`[Seed] account: ${u.email} (${u.role})`);
  }
  // 2. Student dossiers
  for (const d of demoDossiers) {
    const user = await User.findOne({ where: { email: d.email } });
    if (!user) continue;
    const exists = await Etudiant.findOne({ where: { userId: user.id } });
    if (exists) continue;
    await Etudiant.create({
      userId: user.id, matricule: d.matricule,
      dateNaissance: d.dateNaissance || null, adresse: d.adresse || null,
    });
    console.log(`[Seed] dossier: ${d.email} (matricule ${d.matricule})`);
  }
  // 3. Matières
  for (const m of demoMatieres) {
    const teacher = await User.findOne({ where: { email: m.enseignantEmail } });
    if (!teacher) continue;
    const exists = await Matiere.findOne({ where: { intitule: m.intitule } });
    if (exists) continue;
    await Matiere.create({ intitule: m.intitule, coefficient: m.coefficient, enseignantId: teacher.id });
    console.log(`[Seed] matiere: ${m.intitule} (coef ${m.coefficient})`);
  }
  // 4. Notes (Sprint 4)
  for (const n of demoNotes) {
    const matiere = await Matiere.findOne({ where: { intitule: n.matiereIntitule } });
    if (!matiere) continue;
    const user = await User.findOne({ where: { email: n.etudiantEmail } });
    if (!user) continue;
    const etudiant = await Etudiant.findOne({ where: { userId: user.id } });
    if (!etudiant) continue;
    const exists = await Note.findOne({ where: { etudiantId: etudiant.id, matiereId: matiere.id, type: n.type } });
    if (exists) continue;
    await Note.create({ etudiantId: etudiant.id, matiereId: matiere.id, valeur: n.valeur, type: n.type });
    console.log(`[Seed] note: ${n.matiereIntitule} ${n.type} = ${n.valeur} (${n.etudiantEmail})`);
  }
}

// Start the server + sync DB schema + auto-seed on first run
(async () => {
  try {
    await sequelize.authenticate();
    // Non-destructive sync: creates tables if missing, does NOT alter existing
    // (alter:true is destructive on SQLite — it recreates tables and loses data).
    await sequelize.sync();
    console.log('[DB] connected, schema synced (SQLite).');

    const count = await User.count();
    if (count === 0) {
      console.log('[Seed] empty DB — seeding demo data…');
      await seedDemoData();
      console.log('[Seed] done.');
    } else {
      // Sprint 4: if accounts exist but notes don't (DB from a previous sprint),
      // seed just the notes so the demo is complete.
      const noteCount = await Note.count();
      if (noteCount === 0) {
        console.log('[Seed] DB has users but no notes — seeding Sprint 4 demo notes…');
        await seedDemoData();
        console.log('[Seed] done.');
      } else {
        console.log(`[Seed] DB already has ${count} users and ${noteCount} notes, skipping seed.`);
      }
    }

    app.listen(PORT, () => {
      console.log(`[Server] running on http://localhost:${PORT}`);
      console.log(`[SOAP]  WSDL: http://localhost:${PORT}/wsdl?wsdl`);
      console.log(`[SOAP]  accounts: http://localhost:${PORT}/wsdl/accounts?wsdl`);
      console.log(`[SOAP]  students: http://localhost:${PORT}/wsdl/students?wsdl`);
      console.log(`[SOAP]  subjects: http://localhost:${PORT}/wsdl/subjects?wsdl`);
      console.log(`[SOAP]  notes: http://localhost:${PORT}/wsdl/notes?wsdl`);
    });
  } catch (err) {
    console.error('[Startup] unable to start:', err.message);
    process.exit(1);
  }
})();

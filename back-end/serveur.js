// server.js
// SOAP backend mini-service (Sprints 1, 2, 3, 4).
// Port: 3001 (the Next.js frontend runs on 3000 and calls this via SOAP).
//
// Storage: SQLite by default (sandbox), switchable to PostgreSQL via DB_DIALECT.

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { sequelize, User, Etudiant, Matiere, Note, Section, Classe, EnseignantSection, EnseignantClasse } = require('./src/models');
const { attachSoapService } = require('./src/routes/routesSoap');
const restRoutes = require('./src/routes/routesRest');
const { hashPassword } = require('./src/utils/hachage');

const PORT = 3001;

// Ensure the SQLite data directory exists (file-based storage).
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// REST convenience mirror (handy for curl / debugging)
app.use('/api', restRoutes);

// Health check
app.get('/', (req, res) => {
  res.json({
    service: 'Scolarité SOAP',
    sprints: ['1 — Authentification', '2 — Gestion des comptes', '3 — Étudiants & Matières', '4 — Notes & Moyennes', '5 — Sections & Classes'],
    status: 'running',
    wsdl: {
      auth: 'http://localhost:3001/wsdl?wsdl',
      accounts: 'http://localhost:3001/wsdl/accounts?wsdl',
      students: 'http://localhost:3001/wsdl/students?wsdl',
      subjects: 'http://localhost:3001/wsdl/subjects?wsdl',
      notes: 'http://localhost:3001/wsdl/notes?wsdl',
      sections: 'http://localhost:3001/wsdl/sections?wsdl',
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
  { intitule: 'Algorithmique', coefficient: 3, enseignantEmail: 'enseignant@scolarite.com', sectionNom: 'Informatique', classeNom: '3A Info' },
  { intitule: 'Bases de données', coefficient: 4, enseignantEmail: 'enseignant@scolarite.com', sectionNom: 'Informatique', classeNom: '3A Info' },
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

// Demo sections + classes
const demoSections = [
  { nom: 'Informatique', description: 'Filière informatique' },
  { nom: 'Réseaux', description: 'Filière réseaux et télécommunications' },
];
const demoClasses = [
  { nom: '3A Info', sectionNom: 'Informatique' },
  { nom: '1A Info', sectionNom: 'Informatique' },
  { nom: '2A Réseaux', sectionNom: 'Réseaux' },
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
  // 3. Matières (need sections/classes to exist first — moved after step 5)
  // Matières are created after sections/classes are seeded (see below)
  // 4. Notes — created after matières (see step 8/9 below)
  // 5. Sections + Classes
  for (const s of demoSections) {
    const exists = await Section.findOne({ where: { nom: s.nom } });
    if (exists) continue;
    await Section.create(s);
    console.log(`[Seed] section: ${s.nom}`);
  }
  const sectionMap = {};
  for (const c of demoClasses) {
    const section = await Section.findOne({ where: { nom: c.sectionNom } });
    if (!section) continue;
    sectionMap[c.nom] = section;
    const exists = await Classe.findOne({ where: { nom: c.nom, sectionId: section.id } });
    if (exists) continue;
    const classe = await Classe.create({ nom: c.nom, sectionId: section.id });
    console.log(`[Seed] classe: ${c.nom} (${c.sectionNom})`);
  }
  // 6. Assign the demo student to a section + classe
  const classe3A = await Classe.findOne({ where: { nom: '3A Info' } });
  const sectionInfo = await Section.findOne({ where: { nom: 'Informatique' } });
  if (classe3A && sectionInfo) {
    const etu = await Etudiant.findOne({ where: { matricule: 'ETU-001' } });
    if (etu && !etu.classeId) {
      etu.sectionId = sectionInfo.id;
      etu.classeId = classe3A.id;
      await etu.save();
      console.log(`[Seed] etudiant ETU-001 assigned to Informatique / 3A Info`);
    }
  }
  // 7. Assign the demo teacher to the Informatique section + 3A Info classe
  const teacher = await User.findOne({ where: { email: 'enseignant@scolarite.com' } });
  if (teacher && sectionInfo && classe3A) {
    const ea1 = await EnseignantSection.findOne({ where: { userId: teacher.id, sectionId: sectionInfo.id } });
    if (!ea1) { await EnseignantSection.create({ userId: teacher.id, sectionId: sectionInfo.id }); console.log(`[Seed] enseignant assigned to section Informatique`); }
    const ea2 = await EnseignantClasse.findOne({ where: { userId: teacher.id, classeId: classe3A.id } });
    if (!ea2) { await EnseignantClasse.create({ userId: teacher.id, classeId: classe3A.id }); console.log(`[Seed] enseignant assigned to classe 3A Info`); }
  }
  // 8. Create matières (now that sections/classes exist)
  for (const m of demoMatieres) {
    const matTeacher = await User.findOne({ where: { email: m.enseignantEmail } });
    if (!matTeacher) continue;
    const section = await Section.findOne({ where: { nom: m.sectionNom } });
    const classe = await Classe.findOne({ where: { nom: m.classeNom, sectionId: section ? section.id : null } });
    if (!section || !classe) continue;
    const exists = await Matiere.findOne({ where: { intitule: m.intitule, classeId: classe.id } });
    if (exists) continue;
    await Matiere.create({
      intitule: m.intitule, coefficient: m.coefficient,
      enseignantId: matTeacher.id, sectionId: section.id, classeId: classe.id,
    });
    console.log(`[Seed] matiere: ${m.intitule} (coef ${m.coefficient}, ${m.sectionNom}/${m.classeNom})`);
  }
  // 9. Create notes (now that matières exist with the new schema)
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

    // Check if the DB schema is up-to-date. If any new column is missing
    // (sectionId, classeId on etudiants OR matieres), force-sync to recreate
    // all tables with the new schema (data will be lost + re-seeded).
    const { sequelize: seq } = require('./src/models');
    let needsForceSync = false;
    const missingColumns = [];

    // Check etudiants table
    try {
      const etuCols = await seq.getQueryInterface().describeTable('etudiants');
      if (!etuCols.sectionId) missingColumns.push('etudiants.sectionId');
      if (!etuCols.classeId) missingColumns.push('etudiants.classeId');
    } catch (e) {
      // Table doesn't exist yet — normal first run
    }

    // Check matieres table
    try {
      const matCols = await seq.getQueryInterface().describeTable('matieres');
      if (!matCols.sectionId) missingColumns.push('matieres.sectionId');
      if (!matCols.classeId) missingColumns.push('matieres.classeId');
    } catch (e) {
      // Table doesn't exist yet — normal first run
    }

    if (missingColumns.length > 0) {
      console.log('[DB] Missing columns detected:', missingColumns.join(', '), '— recreating schema…');
      needsForceSync = true;
    }

    if (needsForceSync) {
      // Drop and recreate all tables with the new schema
      await sequelize.sync({ force: true });
      console.log('[DB] schema recreated (force sync).');
    } else {
      // Non-destructive sync: creates tables if missing, does NOT alter existing
      await sequelize.sync();
      console.log('[DB] connected, schema synced (SQLite).');
    }

    const count = await User.count();
    if (count === 0 || needsForceSync) {
      console.log('[Seed] seeding demo data…');
      await seedDemoData();
      console.log('[Seed] done.');
    } else {
      // If sections don't exist yet (DB from before this feature), seed them.
      const sectionCount = await Section.count();
      if (sectionCount === 0) {
        console.log('[Seed] DB has users but no sections — seeding sections/classes/assignments…');
        await seedDemoData();
        console.log('[Seed] done.');
      } else {
        console.log(`[Seed] DB already has ${count} users, ${sectionCount} sections, skipping seed.`);
      }
    }

    app.listen(PORT, () => {
      console.log(`[Server] running on http://localhost:${PORT}`);
      console.log(`[SOAP]  WSDL: http://localhost:${PORT}/wsdl?wsdl`);
      console.log(`[SOAP]  accounts: http://localhost:${PORT}/wsdl/accounts?wsdl`);
      console.log(`[SOAP]  students: http://localhost:${PORT}/wsdl/students?wsdl`);
      console.log(`[SOAP]  subjects: http://localhost:${PORT}/wsdl/subjects?wsdl`);
      console.log(`[SOAP]  notes: http://localhost:${PORT}/wsdl/notes?wsdl`);
      console.log(`[SOAP]  sections: http://localhost:${PORT}/wsdl/sections?wsdl`);
    });
  } catch (err) {
    console.error('[Startup] unable to start:', err.message);
    process.exit(1);
  }
})();

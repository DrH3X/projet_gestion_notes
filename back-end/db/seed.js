// db/seed.js
// Seeds demo data for Sprint 1 + 2 + 3.
//  - 3 users (admin, enseignant, étudiant accounts)         [Sprint 1]
//  - 1 extra student account + dossier (matricule, etc.)    [Sprint 3]
//  - 2 matières assigned to the enseignant                  [Sprint 3]

require('dotenv').config();
const { sequelize, User, Etudiant, Matiere } = require('../src/models');
const { hashPassword } = require('../src/utils/hachage');
const authController = require('../src/controllers/controleurAuth');
const studentsController = require('../src/controllers/controleurEtudiants');
const subjectsController = require('../src/controllers/controleurMatieres');

const demoAccounts = [
  { nom: 'Admin', prenom: 'Scolarite', email: 'admin@scolarite.com', motDePasse: 'admin123', role: 'administrateur', classe: null },
  { nom: 'Ben Ali', prenom: 'Mohamed', email: 'enseignant@scolarite.com', motDePasse: 'enseignant123', role: 'enseignant', classe: null },
  { nom: 'Gharbi', prenom: 'Sami', email: 'etudiant@scolarite.com', motDePasse: 'etudiant123', role: 'etudiant', classe: '3A' },
];

const demoDossiers = [
  // The "Sami Gharbi" account already exists above; just attach a dossier to it.
  { email: 'etudiant@scolarite.com', matricule: 'ETU-001', dateNaissance: '2002-05-14', adresse: 'Tunis' },
];

const demoMatieres = [
  { intitule: 'Algorithmique', coefficient: 3, enseignantEmail: 'enseignant@scolarite.com' },
  { intitule: 'Bases de données', coefficient: 4, enseignantEmail: 'enseignant@scolarite.com' },
];

(async () => {
  try {
    await sequelize.authenticate();
    await sequelize.sync({ alter: true });
    console.log('[Seed] DB synced.');

    // 1. Accounts
    for (const u of demoAccounts) {
      const exists = await User.findOne({ where: { email: u.email } });
      if (exists) {
        console.log(`[Seed] skip (account exists): ${u.email}`);
        continue;
      }
      await authController.createUser(u);
      console.log(`[Seed] account: ${u.email} (${u.role})`);
    }

    // 2. Student dossiers (attach to existing student accounts)
    for (const d of demoDossiers) {
      const user = await User.findOne({ where: { email: d.email } });
      if (!user) {
        console.log(`[Seed] skip dossier (user missing): ${d.email}`);
        continue;
      }
      const exists = await Etudiant.findOne({ where: { userId: user.id } });
      if (exists) {
        console.log(`[Seed] skip dossier (exists): ${d.email}`);
        continue;
      }
      await Etudiant.create({
        userId: user.id,
        matricule: d.matricule,
        dateNaissance: d.dateNaissance || null,
        adresse: d.adresse || null,
      });
      console.log(`[Seed] dossier: ${d.email} (matricule ${d.matricule})`);
    }

    // 3. Matières
    for (const m of demoMatieres) {
      const teacher = await User.findOne({ where: { email: m.enseignantEmail } });
      if (!teacher) {
        console.log(`[Seed] skip matiere (teacher missing): ${m.intitule}`);
        continue;
      }
      const exists = await Matiere.findOne({ where: { intitule: m.intitule } });
      if (exists) {
        console.log(`[Seed] skip matiere (exists): ${m.intitule}`);
        continue;
      }
      await subjectsController.creerMatiere({
        intitule: m.intitule,
        coefficient: m.coefficient,
        enseignantId: teacher.id,
      });
      console.log(`[Seed] matiere: ${m.intitule} (coef ${m.coefficient}, teacher #${teacher.id})`);
    }

    console.log('[Seed] done.');
    process.exit(0);
  } catch (err) {
    console.error('[Seed] failed:', err.message);
    process.exit(1);
  }
})();

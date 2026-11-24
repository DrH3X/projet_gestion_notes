# Backend — Scolarité SOAP

Services web SOAP pour la gestion d'étudiants et de notes (Sprints 1, 2, 3, 4).

Node.js + Express + Sequelize + `soap`. Base de données SQLite (par défaut) ou
PostgreSQL.

## Services SOAP (WSDL)

| Service   | Endpoint WSDL                    | Sprint | Opérations |
|-----------|----------------------------------|--------|------------|
| Auth      | `/wsdl?wsdl`                     | 1      | seConnecter, seDeconnecter |
| Accounts  | `/wsdl/accounts?wsdl`            | 2      | creerCompte, listerComptes, modifierCompte, supprimerCompte |
| Students  | `/wsdl/students?wsdl`            | 3      | creerDossier, listerDossiers, consulterDossier, consulterMonDossier, listerMesEtudiants, modifierDossier, supprimerDossier |
| Subjects  | `/wsdl/subjects?wsdl`            | 3      | creerMatiere, listerMatieres, listerMesMatieres, modifierMatiere, supprimerMatiere |
| Notes     | `/wsdl/notes?wsdl`               | 4      | saisirNote, modifierNote, supprimerNote, consulterNotesEnseignant, consulterMoyennesClasse, consulterMesNotes, consulterMonBilan |

Un miroir REST est également disponible sous `/api/*` pour faciliter les tests
(Postman, curl).

## Prérequis

- **Node.js 18+** (et npm)
- Aucune base de données à installer — SQLite est embarqué (fichier local)

## Installation

```bash
cd backend
npm install
```

Copiez le fichier d'exemple de configuration :

```bash
# Windows (cmd)
copy .env.example .env

# Windows (PowerShell)
Copy-Item .env.example .env

# Linux / macOS
cp .env.example .env
```

Éditez ensuite `.env` si besoin (port, secret JWT, base de données).

## Démarrage

```bash
npm run dev    # développement (nodemon, redémarre automatiquement)
# ou
npm start      # production
```

Au premier démarrage, la base est créée et un compte administrateur initial
est inséré automatiquement. **Changez son mot de passe immédiatement après la
première connexion.**

## Compte administrateur initial

| Rôle           | Email                       | Mot de passe    |
|----------------|-----------------------------|-----------------|
| Administrateur | admin@scolarite.com         | admin123        |

> ⚠️ **Sécurité** : ce compte n'est créé que si la base est vide. Changez le
> mot de passe dès la première connexion, puis créez les autres comptes
> (enseignants, étudiants) depuis l'interface d'administration.

## Configuration (`.env`)

| Variable       | Description                              | Défaut                |
|----------------|------------------------------------------|-----------------------|
| `PORT`         | Port HTTP                                | `3001`                |
| `CORS_ORIGIN`  | Origine frontend autorisée (CORS)        | `*`                   |
| `DB_DIALECT`   | `sqlite` ou `postgres`                   | `sqlite`              |
| `DB_FILE`      | Chemin du fichier SQLite                 | `data/scolarite.sqlite` |
| `DB_HOST` …    | Paramètres PostgreSQL (si `postgres`)    | —                     |
| `JWT_SECRET`   | Secret de signature JWT (**à changer**)  | `change_this_secret…` |
| `JWT_EXPIRES_IN` | Durée de vie du jeton                  | `8h`                  |

## Production

1. Définissez `NODE_ENV=production` et un `JWT_SECRET` long et aléatoire.
2. Limitez `CORS_ORIGIN` à l'URL publique du frontend.
3. Utilisez PostgreSQL (`DB_DIALECT=postgres`) pour la persistance en production.
4. Démarrez avec un gestionnaire de processus : `pm2 start serveur.js --name soap-backend`.

## Structure

```
backend/
├── serveur.js             # Point d'entrée (Express + SOAP + seed auto)
├── .env.example
├── wsdl/                  # Contrats WSDL (auth, comptes, etudiants, matieres, notes)
├── src/
│   ├── config/base-donnees.js   # Sequelize (SQLite / PostgreSQL)
│   ├── models/                  # Utilisateur, Etudiant, Matiere, Note
│   ├── controllers/             # controleurAuth, controleurComptes, controleurEtudiants, controleurMatieres, controleurNotes
│   ├── services/                # serviceAuth, serviceComptes, serviceEtudiants, serviceMatieres, serviceNotes
│   ├── routes/                  # routesSoap (montage WSDL) + routesRest (miroir REST)
│   ├── middleware/middlewareAuth.js  # extractUser, requireRole
│   └── utils/                   # hachage (bcrypt), jeton (JWT), erreurs (SOAP faults)
└── db/seed.js             # Script de seed autonome
```

### Noms des services SOAP (WSDL)

| Service WSDL              | Endpoint                | Opérations |
|---------------------------|-------------------------|------------|
| ServiceAuthentification   | `/wsdl`                 | seConnecter, seDeconnecter |
| ServiceComptes            | `/wsdl/accounts`        | creerCompte, listerComptes, modifierCompte, supprimerCompte |
| ServiceEtudiants          | `/wsdl/students`        | creerDossier, listerDossiers, consulterDossier, consulterMonDossier, listerMesEtudiants, modifierDossier, supprimerDossier |
| ServiceMatieres           | `/wsdl/subjects`        | creerMatiere, listerMatieres, listerMesMatieres, modifierMatiere, supprimerMatiere |
| ServiceNotes              | `/wsdl/notes`           | saisirNote, modifierNote, supprimerNote, consulterNotesEnseignant, consulterMoyennesClasse, consulterMesNotes, consulterMonBilan |

## Collection Postman

Une collection Postman pour tester le service SOAP Notes & Moyennes (Sprint 4)
est fournie dans `postman/` :

- **`Sprint4-Notes.postman_collection.json`** — 16 requêtes SOAP couvrant tous
  les besoins fonctionnels (BF10-BF13, BF15-BF18) + les cas d'erreur.
- **`Scolarite-SOAP-Local.postman_environment.json`** — environnement local
  (variables `baseUrl`, jetons, IDs).

### Utilisation

1. Ouvrez Postman → Import → importez les deux fichiers JSON.
2. Sélectionnez l'environnement « Scolarité SOAP — Local ».
3. Démarrez le backend (`npm run dev`).
4. Exécutez les requêtes dans l'ordre :
   - **0. Authentification** → récupère les jetons JWT (sauvegardés automatiquement)
   - **1. Setup** → récupère les IDs (etudiantId, matiereId)
   - **BF10-BF18** → teste les opérations de notes et moyennes
   - **Tests — Cas d'erreur** → valide les faults SOAP (VALEUR_INVALIDE, ACCES_REFUSE…)

## Règles de gestion (Sprint 4)

- Note ∈ [0, 20], type ∈ {DS, examen, TP}
- Moyenne générale pondérée par les coefficients des matières
- Statut : admis si moyenne ≥ 10, ajourné sinon
- Mention : passable [10,12[, assez bien [12,14[, bien [14,16[, très bien ≥16
- Recalcul automatique après toute modification d'une note

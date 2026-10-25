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

Au premier démarrage, la base est créée et des données de démonstration sont
insérées automatiquement (3 comptes + 1 dossier + 2 matières + 6 notes).

## Comptes de démonstration

| Rôle           | Email                       | Mot de passe    |
|----------------|-----------------------------|-----------------|
| Administrateur | admin@scolarite.com         | admin123        |
| Enseignant     | enseignant@scolarite.com    | enseignant123   |
| Étudiant       | etudiant@scolarite.com      | etudiant123     |

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
4. Démarrez avec un gestionnaire de processus : `pm2 start server.js --name soap-backend`.

## Structure

```
backend/
├── server.js              # Point d'entrée (Express + SOAP + seed auto)
├── .env.example
├── wsdl/                  # Contrats WSDL (auth, accounts, students, subjects, notes)
├── src/
│   ├── config/database.js # Sequelize (SQLite / PostgreSQL)
│   ├── models/            # User, Etudiant, Matiere, Note
│   ├── controllers/       # Logique métier + calculs (moyenne, mention, statut)
│   ├── services/          # Mapping SOAP + RBAC
│   ├── routes/            # soapRoutes (mount WSDL) + restRoutes (mirror)
│   ├── middleware/        # authMiddleware (extractUser, requireRole)
│   └── utils/             # hash (bcrypt), token (JWT), faults (SOAP faults)
└── db/seed.js             # Script de seed autonome
```

## Règles de gestion (Sprint 4)

- Note ∈ [0, 20], type ∈ {DS, examen, TP}
- Moyenne générale pondérée par les coefficients des matières
- Statut : admis si moyenne ≥ 10, ajourné sinon
- Mention : passable [10,12[, assez bien [12,14[, bien [14,16[, très bien ≥16
- Recalcul automatique après toute modification d'une note

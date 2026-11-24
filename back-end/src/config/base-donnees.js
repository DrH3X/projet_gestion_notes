// src/config/database.js
// Sequelize connection — SQLite (sandbox) / PostgreSQL (production).
//
// The original backend uses PostgreSQL. In this sandbox PostgreSQL is not
// available, so we transparently fall back to a local SQLite file. The WSDL
// contracts, controllers and services are unchanged — only the storage engine
// differs. UUIDs and ENUMs are emulated by Sequelize on SQLite.

const { Sequelize } = require('sequelize');
const path = require('path');

const DIALECT = (process.env.DB_DIALECT || 'sqlite').toLowerCase();

let sequelize;
if (DIALECT === 'postgres') {
  const isSsl = (process.env.DB_SSL || 'false').toLowerCase() === 'true';
  sequelize = new Sequelize(
    process.env.DB_NAME || 'scolarite_db',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      dialect: 'postgres',
      logging: false,
      dialectOptions: isSsl
        ? { ssl: { require: true, rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED === 'false' } }
        : {},
    }
    
  );
} else {
  // SQLite — file-based, persists across restarts.
  const dbFile = process.env.DB_FILE || path.join(__dirname, '..', '..', 'data', 'scolarite.sqlite');
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: dbFile,
    logging: false,
  });
}

module.exports = sequelize;

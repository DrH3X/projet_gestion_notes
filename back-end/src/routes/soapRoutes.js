// src/routes/soapRoutes.js
// Wires SOAP services to the Express app.
// Each service is mounted on its own path:
//   /wsdl            -> Auth service (login/logout, public)
//   /wsdl/accounts   -> Accounts service (CRUD accounts, admin only)
//   /wsdl/students   -> Students service (CRUD student dossiers, admin only)
//   /wsdl/subjects   -> Subjects service (CRUD matières)

const fs = require('fs');
const path = require('path');
const soap = require('soap');
const authService = require('../services/authService');
const accountsService = require('../services/accountsService');
const studentsService = require('../services/studentsService');
const subjectsService = require('../services/subjectsService');
const notesService = require('../services/notesService');

const WSDL_DIR = path.join(__dirname, '..', '..', 'wsdl');

function readWsdl(name) {
  return fs.readFileSync(path.join(WSDL_DIR, name), 'utf8');
}

const SERVICES = [
  { path: '/wsdl', file: 'auth.wsdl', service: authService, label: 'auth' },
  { path: '/wsdl/accounts', file: 'accounts.wsdl', service: accountsService, label: 'accounts' },
  { path: '/wsdl/students', file: 'students.wsdl', service: studentsService, label: 'students' },
  { path: '/wsdl/subjects', file: 'subjects.wsdl', service: subjectsService, label: 'subjects' },
  { path: '/wsdl/notes', file: 'notes.wsdl', service: notesService, label: 'notes' },
];

/**
 * Attach all SOAP services to the Express app.
 * @param {import('express').Express} app
 */
function attachSoapService(app) {
  for (const s of SERVICES) {
    const wsdl = readWsdl(s.file);
    soap.listen(app, s.path, s.service, wsdl);
    // Raw WSDL download endpoint
    app.get(`${s.path}/file`, (req, res) => {
      res.set('Content-Type', 'text/xml');
      res.send(wsdl);
    });
  }
}

module.exports = { attachSoapService };

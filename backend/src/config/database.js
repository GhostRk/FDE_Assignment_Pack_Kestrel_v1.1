const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const databasePath = path.join(__dirname, '..', '..', '..', 'data', 'kestrel_ops.db');

// The API is read-only: reporting must never alter the supplied source database.
const db = new DatabaseSync(databasePath, { readOnly: true });

module.exports = db;

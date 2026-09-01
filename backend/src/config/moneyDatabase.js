const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new DatabaseSync(path.join(dataDirectory, 'money.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS freight_invoices (
    invoice_id TEXT PRIMARY KEY,
    carrier_id TEXT NOT NULL,
    carrier_name TEXT NOT NULL,
    warehouse_code TEXT NOT NULL,
    route_code TEXT NOT NULL,
    invoice_date TEXT NOT NULL,
    service_date TEXT NOT NULL,
    amount_paise INTEGER NOT NULL,
    currency TEXT NOT NULL,
    fuel_surcharge_pct REAL,
    detention_charge_paise INTEGER,
    distance_km REAL,
    weight_kg REAL,
    temperature_controlled INTEGER NOT NULL,
    status TEXT NOT NULL,
    created_at_utc TEXT NOT NULL,
    synced_at_utc TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_freight_service_date
    ON freight_invoices(service_date);
`);

module.exports = db;

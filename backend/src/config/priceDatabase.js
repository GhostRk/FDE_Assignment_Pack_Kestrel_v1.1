const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const dataDirectory = path.join(__dirname, '..', '..', 'data');
fs.mkdirSync(dataDirectory, { recursive: true });

const db = new DatabaseSync(path.join(dataDirectory, 'prices.db'));
db.exec(`
  CREATE TABLE IF NOT EXISTS competitor_listings (
    listing_id TEXT PRIMARY KEY,
    city TEXT NOT NULL,
    retailer TEXT NOT NULL,
    product_title TEXT NOT NULL,
    category TEXT NOT NULL,
    pack_size_value REAL,
    pack_size_uom TEXT,
    price_paise INTEGER NOT NULL,
    last_seen_date TEXT NOT NULL,
    product_page_path TEXT NOT NULL,
    synced_at_utc TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS ix_listings_city_category
    ON competitor_listings(city, category);
`);

module.exports = db;

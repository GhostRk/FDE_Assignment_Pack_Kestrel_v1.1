const moneyDb = require('../config/moneyDatabase');

const PARTNER_API_URL = process.env.PARTNER_API_URL || 'http://localhost:8088';
const PARTNER_API_KEY = process.env.PARTNER_API_KEY || 'kp_live_7f3a9c21';
const MAX_RETRIES = 5;

function wait(milliseconds) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function fetchWithRetry(url) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: { 'X-API-Key': PARTNER_API_KEY },
        signal: AbortSignal.timeout(20_000),
      });

      if (response.ok) return response.json();

      if (response.status !== 429 && response.status !== 503) {
        throw new Error(`Partner API returned HTTP ${response.status}`);
      }

      if (attempt === MAX_RETRIES) {
        throw new Error(`Partner API remained unavailable after ${MAX_RETRIES + 1} attempts`);
      }

      const retryAfterSeconds = Number(response.headers.get('retry-after'));
      await wait(Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 500 * (attempt + 1));
    } catch (error) {
      if (attempt === MAX_RETRIES || error.message.startsWith('Partner API')) throw error;
      await wait(500 * (attempt + 1));
    }
  }
}

const insertInvoice = moneyDb.prepare(`
  INSERT INTO freight_invoices (
    invoice_id, carrier_id, carrier_name, warehouse_code, route_code,
    invoice_date, service_date, amount_paise, currency, fuel_surcharge_pct,
    detention_charge_paise, distance_km, weight_kg, temperature_controlled,
    status, created_at_utc, synced_at_utc
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(invoice_id) DO UPDATE SET
    carrier_id = excluded.carrier_id,
    carrier_name = excluded.carrier_name,
    warehouse_code = excluded.warehouse_code,
    route_code = excluded.route_code,
    invoice_date = excluded.invoice_date,
    service_date = excluded.service_date,
    amount_paise = excluded.amount_paise,
    currency = excluded.currency,
    fuel_surcharge_pct = excluded.fuel_surcharge_pct,
    detention_charge_paise = excluded.detention_charge_paise,
    distance_km = excluded.distance_km,
    weight_kg = excluded.weight_kg,
    temperature_controlled = excluded.temperature_controlled,
    status = excluded.status,
    created_at_utc = excluded.created_at_utc,
    synced_at_utc = excluded.synced_at_utc
`);

function saveInvoices(invoices) {
  const syncedAt = new Date().toISOString();
  moneyDb.exec('BEGIN');
  try {
    for (const invoice of invoices) {
      insertInvoice.run(
        invoice.invoice_id,
        invoice.carrier_id,
        invoice.carrier_name,
        invoice.warehouse_code,
        invoice.route_code,
        invoice.invoice_date,
        invoice.service_date,
        invoice.amount,
        invoice.currency,
        invoice.fuel_surcharge_pct,
        invoice.detention_charge,
        invoice.distance_km,
        invoice.weight_kg,
        Number(invoice.temperature_controlled),
        invoice.status,
        invoice.created_at_utc,
        syncedAt,
      );
    }
    moneyDb.exec('COMMIT');
  } catch (error) {
    moneyDb.exec('ROLLBACK');
    throw error;
  }
}

async function syncFreightInvoices(from, to) {
  let cursor;
  let pages = 0;
  let invoiceCount = 0;

  do {
    const params = new URLSearchParams({ from, to, limit: '200' });
    if (cursor) params.set('cursor', cursor);

    const page = await fetchWithRetry(`${PARTNER_API_URL}/v1/freight_invoices?${params}`);
    saveInvoices(page.data);
    pages += 1;
    invoiceCount += page.data.length;
    cursor = page.next_cursor;
  } while (cursor);

  return { from, to, pages, invoice_count: invoiceCount };
}

module.exports = { syncFreightInvoices };

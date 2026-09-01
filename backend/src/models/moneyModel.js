const sourceDb = require('../config/database');
const moneyDb = require('../config/moneyDatabase');

function getFreightByCarrier(from, to) {
  const deliveriesByKey = sourceDb.prepare(`
    SELECT
      w.warehouse_code,
      r.route_code,
      date(d.dispatch_datetime) AS service_date,
      ROUND(SUM(CASE
        WHEN ol.qty_uom = 'CASE' THEN ol.delivered_qty
        ELSE ol.delivered_qty * 1.0 / ol.case_pack_at_order
      END), 3) AS delivered_cases
    FROM deliveries d
    JOIN orders o ON o.order_id = d.order_id
    JOIN order_lines ol ON ol.order_id = o.order_id
    JOIN warehouses w ON w.warehouse_id = d.warehouse_id
    JOIN routes r ON r.route_id = d.route_id
    WHERE date(d.dispatch_datetime) BETWEEN ? AND ?
      AND d.delivery_status IN ('DELIVERED', 'PART_DELIVERED')
    GROUP BY w.warehouse_code, r.route_code, date(d.dispatch_datetime)
  `).all(from, to);

  moneyDb.exec('DROP TABLE IF EXISTS temp.delivery_cases');
  moneyDb.exec(`
    CREATE TEMP TABLE delivery_cases (
      warehouse_code TEXT,
      route_code TEXT,
      service_date TEXT,
      delivered_cases REAL,
      PRIMARY KEY (warehouse_code, route_code, service_date)
    )
  `);
  const insertDeliveryCases = moneyDb.prepare(`
    INSERT INTO delivery_cases VALUES (?, ?, ?, ?)
  `);
  moneyDb.exec('BEGIN');
  try {
    for (const row of deliveriesByKey) {
      insertDeliveryCases.run(row.warehouse_code, row.route_code, row.service_date, row.delivered_cases);
    }
    moneyDb.exec('COMMIT');
  } catch (error) {
    moneyDb.exec('ROLLBACK');
    throw error;
  }

  return moneyDb.prepare(`
    SELECT
      fi.carrier_name,
      COUNT(*) AS invoice_count,
      ROUND(SUM(fi.amount_paise) / 100.0, 2) AS freight_cost_inr,
      ROUND(SUM(CASE WHEN dc.delivered_cases IS NOT NULL THEN fi.amount_paise ELSE 0 END) / 100.0, 2) AS matched_freight_cost_inr,
      ROUND(SUM(CASE WHEN dc.delivered_cases IS NULL THEN fi.amount_paise ELSE 0 END) / 100.0, 2) AS unmatched_freight_cost_inr,
      ROUND(SUM(COALESCE(dc.delivered_cases, 0)), 2) AS matched_delivered_cases,
      ROUND(
        SUM(CASE WHEN dc.delivered_cases IS NOT NULL THEN fi.amount_paise ELSE 0 END) / 100.0 /
        NULLIF(SUM(COALESCE(dc.delivered_cases, 0)), 0),
        2
      ) AS freight_cost_per_case_inr,
      SUM(CASE WHEN dc.delivered_cases IS NULL THEN 1 ELSE 0 END) AS unmatched_invoice_count
    FROM freight_invoices fi
    LEFT JOIN delivery_cases dc
      ON dc.warehouse_code = fi.warehouse_code
      AND dc.route_code = fi.route_code
      AND dc.service_date = fi.service_date
    WHERE fi.invoice_date BETWEEN ? AND ?
    GROUP BY fi.carrier_id, fi.carrier_name
    ORDER BY freight_cost_per_case_inr DESC, fi.carrier_name
  `).all(from, to);
}

function getReturnLeakageByCategory(from, to) {
  const dispatchRows = sourceDb.prepare(`
    SELECT
      p.category,
      ROUND(SUM(ol.line_value_inr * ol.delivered_qty / NULLIF(ol.ordered_qty, 0)), 2) AS dispatch_value_inr
    FROM deliveries d
    JOIN orders o ON o.order_id = d.order_id
    JOIN order_lines ol ON ol.order_id = o.order_id
    JOIN products p ON p.product_id = ol.product_id
    WHERE date(d.dispatch_datetime) BETWEEN ? AND ?
      AND d.delivery_status IN ('DELIVERED', 'PART_DELIVERED')
    GROUP BY p.category
  `).all(from, to);

  const returnsRows = sourceDb.prepare(`
    SELECT
      p.category,
      ROUND(SUM(ABS(rc.credit_note_value_inr)), 2) AS credit_note_value_inr,
      COUNT(*) AS return_line_count
    FROM returns_credit_notes rc
    JOIN products p ON p.product_id = rc.product_id
    WHERE rc.return_date BETWEEN ? AND ?
    GROUP BY p.category
  `).all(from, to);

  const returnsByCategory = new Map(returnsRows.map((row) => [row.category, row]));
  return dispatchRows.map((row) => {
    const returnRow = returnsByCategory.get(row.category) || { credit_note_value_inr: 0, return_line_count: 0 };
    return {
      category: row.category,
      dispatch_value_inr: row.dispatch_value_inr,
      credit_note_value_inr: returnRow.credit_note_value_inr,
      return_line_count: returnRow.return_line_count,
      return_leakage_pct: Number((100 * returnRow.credit_note_value_inr / row.dispatch_value_inr).toFixed(2)),
    };
  }).sort((a, b) => b.return_leakage_pct - a.return_leakage_pct);
}

function getInvoiceSyncStatus() {
  return moneyDb.prepare(`
    SELECT COUNT(*) AS invoice_count, MAX(synced_at_utc) AS last_synced_at_utc
    FROM freight_invoices
  `).get();
}

module.exports = { getFreightByCarrier, getReturnLeakageByCategory, getInvoiceSyncStatus };

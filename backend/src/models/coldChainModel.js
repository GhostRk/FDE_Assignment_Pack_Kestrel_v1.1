const db = require('../config/database');

function getMonthlyExcursions(from, to) {
  const sql = `
    WITH chilled_deliveries AS (
      SELECT DISTINCT
        d.delivery_id,
        d.dispatch_datetime,
        d.temperature_excursion_flag
      FROM deliveries d
      WHERE EXISTS (
        SELECT 1
        FROM order_lines ol
        JOIN products p ON p.product_id = ol.product_id
        WHERE ol.order_id = d.order_id
          AND p.is_chilled = 1
      )
    )
    SELECT
      substr(dispatch_datetime, 1, 7) AS month,
      COUNT(*) AS chilled_deliveries,
      SUM(temperature_excursion_flag) AS excursion_count,
      ROUND(100.0 * SUM(temperature_excursion_flag) / COUNT(*), 2) AS excursions_per_100_deliveries
    FROM chilled_deliveries
    WHERE date(dispatch_datetime) BETWEEN ? AND ?
    GROUP BY substr(dispatch_datetime, 1, 7)
    ORDER BY month
  `;

  return db.prepare(sql).all(from, to);
}

function getNearExpiryStock(asOfDate, days) {
  const snapshot = db.prepare(`
    SELECT MAX(snapshot_date) AS snapshot_date
    FROM inventory_snapshots
    WHERE snapshot_date <= ?
  `).get(asOfDate);

  if (!snapshot.snapshot_date) {
    return { snapshot_date: null, by_warehouse: [] };
  }

  const sql = `
    SELECT
      w.warehouse_name,
      COUNT(*) AS batch_count,
      SUM(i.available_cases) AS available_cases,
      SUM(i.on_hand_eaches) AS on_hand_eaches
    FROM inventory_snapshots i
    JOIN warehouses w ON w.warehouse_id = i.warehouse_id
    WHERE i.snapshot_date = ?
      AND i.expiry_date >= ?
      AND i.expiry_date <= date(?, '+' || ? || ' days')
      AND i.available_cases > 0
    GROUP BY i.warehouse_id, w.warehouse_name
    ORDER BY available_cases DESC, w.warehouse_name
  `;

  return {
    snapshot_date: snapshot.snapshot_date,
    by_warehouse: db.prepare(sql).all(
      snapshot.snapshot_date,
      snapshot.snapshot_date,
      snapshot.snapshot_date,
      days,
    ),
  };
}

function getColdChainReturns(from, to) {
  const sql = `
    SELECT
      p.category,
      COUNT(*) AS return_lines,
      ROUND(SUM(ABS(rc.return_qty) * CASE
        WHEN rc.qty_uom = 'CASE' THEN COALESCE(ol.case_pack_at_order, p.case_pack)
        ELSE 1
      END), 0) AS returned_eaches,
      ROUND(SUM(ABS(rc.credit_note_value_inr)), 2) AS credit_note_value_inr
    FROM returns_credit_notes rc
    JOIN products p ON p.product_id = rc.product_id
    LEFT JOIN order_lines ol ON ol.order_line_id = rc.order_line_id
    WHERE rc.return_reason_code = 'RT06_COLD_CHAIN_BREACH'
      AND rc.return_date BETWEEN ? AND ?
    GROUP BY p.category
    ORDER BY credit_note_value_inr DESC, p.category
  `;

  return db.prepare(sql).all(from, to);
}

module.exports = {
  getMonthlyExcursions,
  getNearExpiryStock,
  getColdChainReturns,
};

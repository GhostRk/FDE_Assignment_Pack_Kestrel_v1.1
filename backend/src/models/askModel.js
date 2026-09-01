const db = require('../config/database');

function getLatestDataDate() {
  return db.prepare(`
    SELECT MAX(order_date) AS date
    FROM orders
    WHERE order_status NOT IN ('CANCELLED', 'OPEN')
  `).get().date;
}

function getFillRateComparison(region, latestDate) {
  return db.prepare(`
    WITH daily_service AS (
      SELECT
        o.order_date,
        SUM(CASE WHEN ol.qty_uom = 'CASE'
          THEN ol.ordered_qty * ol.case_pack_at_order ELSE ol.ordered_qty END) AS ordered_eaches,
        SUM(CASE WHEN ol.qty_uom = 'CASE'
          THEN ol.delivered_qty * ol.case_pack_at_order ELSE ol.delivered_qty END) AS delivered_eaches
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.order_id
      JOIN regions r ON r.region_id = o.region_id
      WHERE r.region_name = ?
        AND o.order_status NOT IN ('CANCELLED', 'OPEN')
        AND o.order_date BETWEEN date(?, '-13 days') AND ?
      GROUP BY o.order_date
    )
    SELECT
      CASE WHEN order_date >= date(?, '-6 days') THEN 'latest_week' ELSE 'previous_week' END AS period,
      MIN(order_date) AS from_date,
      MAX(order_date) AS to_date,
      ROUND(100.0 * SUM(delivered_eaches) / SUM(ordered_eaches), 2) AS fill_rate_pct,
      ROUND(SUM(ordered_eaches - delivered_eaches), 0) AS shortfall_eaches
    FROM daily_service
    GROUP BY period
    ORDER BY period DESC
  `).all(region, latestDate, latestDate, latestDate);
}

function getShortfallDrivers(region, latestDate) {
  return db.prepare(`
    WITH category_shortfall AS (
      SELECT
        p.category,
        CASE WHEN o.order_date >= date(?, '-6 days') THEN 'latest_week' ELSE 'previous_week' END AS period,
        SUM(CASE WHEN ol.qty_uom = 'CASE'
          THEN (ol.ordered_qty - ol.delivered_qty) * ol.case_pack_at_order
          ELSE ol.ordered_qty - ol.delivered_qty END) AS shortfall_eaches
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.order_id
      JOIN products p ON p.product_id = ol.product_id
      JOIN regions r ON r.region_id = o.region_id
      WHERE r.region_name = ?
        AND o.order_status NOT IN ('CANCELLED', 'OPEN')
        AND o.order_date BETWEEN date(?, '-13 days') AND ?
      GROUP BY p.category, period
    )
    SELECT
      category,
      ROUND(MAX(CASE WHEN period = 'latest_week' THEN shortfall_eaches ELSE 0 END), 0) AS latest_shortfall_eaches,
      ROUND(MAX(CASE WHEN period = 'previous_week' THEN shortfall_eaches ELSE 0 END), 0) AS previous_shortfall_eaches,
      ROUND(
        MAX(CASE WHEN period = 'latest_week' THEN shortfall_eaches ELSE 0 END)
        - MAX(CASE WHEN period = 'previous_week' THEN shortfall_eaches ELSE 0 END),
        0
      ) AS shortfall_change_eaches
    FROM category_shortfall
    GROUP BY category
    ORDER BY shortfall_change_eaches DESC
    LIMIT 3
  `).all(latestDate, region, latestDate, latestDate);
}

function getWorstRoutes(region, latestDate) {
  return db.prepare(`
    SELECT
      rt.route_code,
      rt.route_name,
      ROUND(100.0 * SUM(CASE WHEN ol.qty_uom = 'CASE'
        THEN ol.delivered_qty * ol.case_pack_at_order ELSE ol.delivered_qty END) /
        SUM(CASE WHEN ol.qty_uom = 'CASE'
        THEN ol.ordered_qty * ol.case_pack_at_order ELSE ol.ordered_qty END), 2) AS fill_rate_pct,
      ROUND(SUM(CASE WHEN ol.qty_uom = 'CASE'
        THEN (ol.ordered_qty - ol.delivered_qty) * ol.case_pack_at_order
        ELSE ol.ordered_qty - ol.delivered_qty END), 0) AS shortfall_eaches
    FROM orders o
    JOIN order_lines ol ON ol.order_id = o.order_id
    JOIN routes rt ON rt.route_id = o.route_id
    JOIN regions r ON r.region_id = o.region_id
    WHERE r.region_name = ?
      AND o.order_status NOT IN ('CANCELLED', 'OPEN')
      AND o.order_date BETWEEN date(?, '-6 days') AND ?
    GROUP BY rt.route_id, rt.route_code, rt.route_name
    ORDER BY fill_rate_pct ASC, shortfall_eaches DESC
    LIMIT 3
  `).all(region, latestDate, latestDate);
}

module.exports = { getLatestDataDate, getFillRateComparison, getShortfallDrivers, getWorstRoutes };

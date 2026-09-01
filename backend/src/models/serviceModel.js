const db = require('../config/database');

// Only these known SQL fragments can be selected by group_by.
// This prevents a query parameter from becoming executable SQL.
const GROUPS = {
  region: {
    id: 'o.region_id',
    join: 'JOIN regions dimension ON dimension.region_id = service.group_id',
    label: 'dimension.region_name',
  },
  warehouse: {
    id: 'o.warehouse_id',
    join: 'JOIN warehouses dimension ON dimension.warehouse_id = service.group_id',
    label: 'dimension.warehouse_name',
  },
  route: {
    id: 'o.route_id',
    join: 'JOIN routes dimension ON dimension.route_id = service.group_id',
    label: "dimension.route_code || ' — ' || dimension.route_name",
  },
  outlet: {
    id: 'o.outlet_id',
    join: 'JOIN outlets dimension ON dimension.outlet_id = service.group_id',
    label: "dimension.outlet_code || ' — ' || dimension.outlet_name",
  },
};

function getPerformance({ groupBy, from, to }) {
  const group = GROUPS[groupBy];

  const sql = `
    WITH order_service AS (
      SELECT
        o.order_id,
        ${group.id} AS group_id,
        SUM(CASE
          WHEN ol.qty_uom = 'CASE'
            THEN ol.ordered_qty * ol.case_pack_at_order
          ELSE ol.ordered_qty
        END) AS ordered_eaches,
        SUM(CASE
          WHEN ol.qty_uom = 'CASE'
            THEN ol.delivered_qty * ol.case_pack_at_order
          ELSE ol.delivered_qty
        END) AS delivered_eaches,
        MIN(CASE
          WHEN ol.delivered_qty >= ol.ordered_qty THEN 1
          ELSE 0
        END) AS delivered_in_full,
        d.delay_minutes
      FROM orders o
      JOIN order_lines ol ON ol.order_id = o.order_id
      JOIN deliveries d ON d.order_id = o.order_id
      WHERE o.order_status NOT IN ('CANCELLED', 'OPEN')
        AND o.order_date BETWEEN ? AND ?
      GROUP BY o.order_id, ${group.id}, d.delay_minutes
    )
    SELECT
      ${group.label} AS name,
      ROUND(100.0 * SUM(service.delivered_eaches) / SUM(service.ordered_eaches), 2) AS fill_rate_pct,
      ROUND(100.0 * AVG(CASE
        WHEN service.delivered_in_full = 1 AND service.delay_minutes <= 0 THEN 1.0
        ELSE 0.0
      END), 2) AS strict_otif_pct,
      ROUND(100.0 * AVG(CASE
        WHEN service.delay_minutes <= 0 THEN 1.0
        ELSE 0.0
      END), 2) AS on_time_delivery_pct,
      COUNT(*) AS order_count,
      ROUND(SUM(service.ordered_eaches), 0) AS ordered_eaches,
      ROUND(SUM(service.delivered_eaches), 0) AS delivered_eaches
    FROM order_service service
    ${group.join}
    GROUP BY service.group_id, ${group.label}
    ORDER BY fill_rate_pct ASC, on_time_delivery_pct ASC, name ASC
  `;

  return db.prepare(sql).all(from, to);
}

function supportsGroupBy(groupBy) {
  return Object.hasOwn(GROUPS, groupBy);
}

module.exports = { getPerformance, supportsGroupBy };

# Decisions

## What I built

A Node.js/Express API backed by the supplied SQLite database. `GET /api/service/performance` reports Q1 service performance by `region`, `warehouse`, `route`, or `outlet`. `GET /api/cold-chain/overview` reports temperature excursions, near-expiry stock, and cold-chain breach returns. The default period is Q1 FY 2026-27 (1 April to 30 June 2026), because Kestrel's financial year starts in April and the brief asks for Q1 on the front page.

## Metric definitions and assumptions

- **Fill rate** is `delivered eaches / ordered eaches`. `CASE` quantities are converted using `case_pack_at_order`; `EACH` quantities are used as-is. This follows the sales manager's clarification, which overrides the earlier request to measure in cases.
- **Strict OTIF** is an order where every order line is fully delivered and `delay_minutes <= 0`. I use `delay_minutes` rather than parsing `actual_arrival`, because the timestamp formats vary and conflict with that field in sampled records.
- Cancelled and open orders are excluded. Performance is attributed using the order header's region, warehouse, route, and outlet, rather than current master assignments.
- **Temperature excursions** are reported per 100 deliveries containing at least one chilled SKU, grouped by dispatch month. **Near-expiry stock** is available inventory expiring within 30 days of the latest snapshot on or before the requested end date. **Cold-chain returns** use return reason `RT06_COLD_CHAIN_BREACH`; return quantities and credit-note values use absolute values because the source has inconsistent signs.

## Data quality finding

All 76,889 completed orders have at least one short order line, including 65,896 orders marked `DELIVERED`. Strict OTIF is therefore 0% for every group. The API reports this explicitly and supplies on-time delivery rate separately. It does not use the header status as an unreliable proxy for “in full”.

## Deliberately not built yet

The dashboard UI, freight/returns leakage, competitor-price ingestion, and ask-anything experience. The partner carrier API is also not yet ingested. I focused on auditable Service and Cold Chain vertical slices before adding breadth.

## With two more weeks

Build the one-screen dashboard with Q1 default and immediate worst-performer rankings; add cold-chain and financial metrics; ingest carrier invoices with retries and idempotency; scrape the supplied competitor site on a scheduled job; introduce saved regional-manager filters and an evidence-backed question interface.

## What breaks first in production

SQLite and on-demand aggregation will not handle concurrent users or sustained growth. I would move transformed data to a warehouse, pre-aggregate daily service facts, add a proper ingestion pipeline and data-quality tests, and replace the permissive development CORS policy with authenticated role-based access.

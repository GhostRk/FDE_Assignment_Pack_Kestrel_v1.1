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

The dashboard UI. Ask-anything uses Gemini function calling with only approved reporting tools; the model interprets a question and writes a response, while the backend executes the calculations. This prevents model-generated raw SQL and requires answers to be grounded in a tool result. Freight invoice synchronisation and Money reporting are implemented, but carrier invoices have no delivery ID, so freight cost per case is limited to invoices matched by warehouse, route, and service date; unmatched invoice cost is surfaced separately. Competitor-price ingestion is implemented from the supplied BazaarPulse site, using only pages allowed by `robots.txt`.

## Price-position matching

BazaarPulse listings have no Kestrel SKU key. A price comparison is reported only where a non-Kestrel listing exactly matches a Kestrel SKU's category, normalised product type, pack size, and pack unit. This deliberately sacrifices coverage for auditability. The product master also contains multiple current Kestrel records with the same product signature but different MRP; they remain separate SKUs and are shown separately rather than arbitrarily deduplicated.

## With two more weeks

Build the one-screen dashboard with Q1 default and immediate worst-performer rankings; add cold-chain and financial metrics; ingest carrier invoices with retries and idempotency; scrape the supplied competitor site on a scheduled job; introduce saved regional-manager filters and an evidence-backed question interface.

## What breaks first in production

SQLite and on-demand aggregation will not handle concurrent users or sustained growth. I would move transformed data to a warehouse, pre-aggregate daily service facts, add a proper ingestion pipeline and data-quality tests, and replace the permissive development CORS policy with authenticated role-based access.

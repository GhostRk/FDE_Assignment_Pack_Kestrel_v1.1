# Kestrel Control Tower

This is the first Service API for the Kestrel control-tower assignment. It reads the supplied SQLite database without modifying it.

## Structure

```text
backend/src/
├── config/       database connection
├── models/       SQL and data access
├── controllers/  request validation and response construction
├── routes/       endpoint-to-controller mapping
├── app.js        HTTP request handler
└── server.js     server startup
```

## Run

Requires Node.js 22.5 or later (the project uses Node's built-in SQLite module).

Install dependencies once:

```bash
npm install
```

```bash
npm start
```

The API starts at `http://localhost:3000`.

## Endpoints

```text
GET /api/health
GET /api/service/performance
GET /api/cold-chain/overview
GET /api/money/overview
POST /api/money/sync-freight-invoices
GET /api/prices/position
POST /api/prices/sync-competitor-prices
POST /api/ask
```

`/api/service/performance` defaults to Q1 FY 2026-27 (`2026-04-01` to `2026-06-30`) and groups by region.

Optional query parameters:

```text
group_by=region|warehouse|route|outlet
from=YYYY-MM-DD
to=YYYY-MM-DD
```

Example:

```bash
curl 'http://localhost:3000/api/service/performance?group_by=region'
```

The response reports fill rate in eaches, strict OTIF, and on-time delivery rate. It also exposes a data-quality warning: every completed source order has at least one short line, so strict OTIF is 0% for every group.

## Cold Chain endpoint

`/api/cold-chain/overview` defaults to Q1 FY 2026-27. It returns monthly temperature excursions per 100 chilled deliveries, near-expiry stock by warehouse, and cold-chain breach returns by product category.

Optional query parameters:

```text
from=YYYY-MM-DD
to=YYYY-MM-DD
near_expiry_days=1..180
```

Example:

```bash
curl 'http://localhost:3000/api/cold-chain/overview?near_expiry_days=30'
```

## Money endpoints

The Money API first synchronises invoices from the supplied carrier partner API into `backend/data/money.db`. This local application data is ignored by Git.

Start the supplied partner API in another terminal:

```bash
python3 partner_api/server.py
```

Synchronise the desired invoice period. The partner service is deliberately paginated and intermittently rate-limited; the sync follows cursors and retries `429` and `503` responses.

```bash
curl -X POST 'http://localhost:3000/api/money/sync-freight-invoices?from=2026-04-01&to=2026-06-30'
```

Then retrieve freight cost per delivered case by carrier and return-credit leakage by category:

```bash
curl 'http://localhost:3000/api/money/overview?from=2026-04-01&to=2026-06-30'
```

## Price Position endpoints

The price sync reads the provided BazaarPulse static site, respects its crawl policy by excluding `/internal/`, and stores observed listings in `backend/data/prices.db` (ignored by Git).

```bash
curl -X POST 'http://localhost:3000/api/prices/sync-competitor-prices'
curl 'http://localhost:3000/api/prices/position?city=Mumbai'
```

Supported cities are `Mumbai`, `Bengaluru`, `Delhi%20NCR`, and `Chennai`. A Kestrel SKU is compared only with a non-Kestrel listing that exactly matches category, normalised product type, pack size, and unit.

## Ask-anything endpoint

The first grounded question flow supports the illustrative question from the client brief. It returns a concise answer and auditable evidence rather than an unsupported generated explanation.

```bash
curl -X POST 'http://localhost:3000/api/ask' \
  -H 'Content-Type: application/json' \
  -d '{"question":"Why did fill rate drop in West last week?"}'
```

“Last week” is anchored to the final seven days available in the operational data. Unsupported questions return a `422` response and a list of supported question formats.

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

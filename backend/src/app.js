const express = require('express');
const serviceRoutes = require('./routes/serviceRoutes');
const coldChainRoutes = require('./routes/coldChainRoutes');
const moneyRoutes = require('./routes/moneyRoutes');
const priceRoutes = require('./routes/priceRoutes');
const askRoutes = require('./routes/askRoutes');

const app = express();

app.use(express.json());

// Allows a separate frontend app to call this API during local development.
app.use((request, response, next) => {
  response.setHeader('Access-Control-Allow-Origin', '*');
  next();
});

app.get('/api/health', (request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/service', serviceRoutes);
app.use('/api/cold-chain', coldChainRoutes);
app.use('/api/money', moneyRoutes);
app.use('/api/prices', priceRoutes);
app.use('/api/ask', askRoutes);

app.use((request, response) => {
  response.status(404).json({
    error: 'Not found',
    available_endpoints: [
      '/api/health',
      '/api/service/performance',
      '/api/cold-chain/overview',
      '/api/money/overview',
      '/api/money/sync-freight-invoices',
      '/api/prices/position',
      '/api/prices/sync-competitor-prices',
      '/api/ask',
    ],
  });
});

app.use((error, request, response, next) => {
  response.status(400).json({ error: error.message });
});

module.exports = app;

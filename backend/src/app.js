const express = require('express');
const serviceRoutes = require('./routes/serviceRoutes');
const coldChainRoutes = require('./routes/coldChainRoutes');

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

app.use((request, response) => {
  response.status(404).json({
    error: 'Not found',
    available_endpoints: [
      '/api/health',
      '/api/service/performance',
      '/api/cold-chain/overview',
    ],
  });
});

app.use((error, request, response, next) => {
  response.status(400).json({ error: error.message });
});

module.exports = app;

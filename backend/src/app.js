const express = require('express');
const serviceRoutes = require('./routes/serviceRoutes');

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

app.use((request, response) => {
  response.status(404).json({
    error: 'Not found',
    available_endpoints: ['/api/health', '/api/service/performance'],
  });
});

app.use((error, request, response, next) => {
  response.status(400).json({ error: error.message });
});

module.exports = app;

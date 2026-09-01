const { routeServiceRequest } = require('./routes/serviceRoutes');

function sendJson(response, statusCode, body) {
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
  });
  response.end(JSON.stringify(body, null, 2));
}

function requestHandler(request, response) {
  const url = new URL(request.url, `http://${request.headers.host || 'localhost'}`);

  if (request.method !== 'GET') {
    sendJson(response, 405, { error: 'Method not allowed' });
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { status: 'ok' });
    return;
  }

  try {
    const result = routeServiceRequest(url);
    if (result) {
      sendJson(response, 200, result);
      return;
    }
  } catch (error) {
    sendJson(response, 400, { error: error.message });
    return;
  }

  sendJson(response, 404, {
    error: 'Not found',
    available_endpoints: ['/api/health', '/api/service/performance'],
  });
}

module.exports = { requestHandler };

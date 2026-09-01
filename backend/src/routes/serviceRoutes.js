const { servicePerformance } = require('../controllers/serviceController');

function routeServiceRequest(url) {
  if (url.pathname !== '/api/service/performance') {
    return null;
  }

  return servicePerformance(url.searchParams);
}

module.exports = { routeServiceRequest };

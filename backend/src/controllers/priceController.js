const priceModel = require('../models/priceModel');
const priceSyncService = require('../services/priceSyncService');

const ALLOWED_CITIES = new Set(['Mumbai', 'Bengaluru', 'Delhi NCR', 'Chennai']);

function syncCompetitorPrices(request, response, next) {
  try {
    response.json({ data: priceSyncService.syncCompetitorPrices() });
  } catch (error) {
    next(error);
  }
}

function pricePosition(request, response, next) {
  const city = request.query.city || 'Mumbai';
  try {
    if (!ALLOWED_CITIES.has(city)) {
      throw new Error('city must be one of: Mumbai, Bengaluru, Delhi NCR, Chennai');
    }
    const rows = priceModel.getPricePosition(city);
    response.json({
      data: {
        by_sku: rows,
        by_category: priceModel.summariseByCategory(rows),
      },
      meta: {
        city,
        sync_status: priceModel.getSyncStatus(),
        matching_method: 'Exact category, product type, pack size, and pack unit match; non-Kestrel listings only.',
        definition: 'Price gap is Kestrel current MRP minus the lowest observed competitor shelf price.',
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { syncCompetitorPrices, pricePosition };

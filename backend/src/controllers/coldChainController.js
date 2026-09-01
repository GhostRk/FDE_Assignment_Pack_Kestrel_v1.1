const coldChainModel = require('../models/coldChainModel');

const DEFAULT_FROM = '2026-04-01';
const DEFAULT_TO = '2026-06-30';
const DEFAULT_NEAR_EXPIRY_DAYS = 30;

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function coldChainOverview(request, response, next) {
  const from = request.query.from || DEFAULT_FROM;
  const to = request.query.to || DEFAULT_TO;
  const nearExpiryDays = Number(request.query.near_expiry_days || DEFAULT_NEAR_EXPIRY_DAYS);

  try {
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      throw new Error('from and to must be valid YYYY-MM-DD dates, with from before to');
    }
    if (!Number.isInteger(nearExpiryDays) || nearExpiryDays < 1 || nearExpiryDays > 180) {
      throw new Error('near_expiry_days must be a whole number from 1 to 180');
    }

    const temperatureExcursions = coldChainModel.getMonthlyExcursions(from, to);
    const nearExpiryStock = coldChainModel.getNearExpiryStock(to, nearExpiryDays);
    const coldChainReturns = coldChainModel.getColdChainReturns(from, to);

    response.json({
      data: {
        temperature_excursions: temperatureExcursions,
        near_expiry_stock: nearExpiryStock,
        cold_chain_returns: coldChainReturns,
      },
      meta: {
        from,
        to,
        near_expiry_days: nearExpiryDays,
        definitions: {
          temperature_excursions: 'Excursions per 100 deliveries whose order contains at least one chilled SKU.',
          near_expiry_stock: 'Available inventory with an expiry date within the threshold after the latest snapshot on or before the requested end date.',
          cold_chain_returns: 'Credit-note lines whose return reason is RT06_COLD_CHAIN_BREACH.',
        },
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { coldChainOverview };

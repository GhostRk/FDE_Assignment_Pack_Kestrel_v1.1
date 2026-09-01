const askModel = require('../models/askModel');
const serviceModel = require('../models/serviceModel');
const coldChainModel = require('../models/coldChainModel');
const moneyModel = require('../models/moneyModel');
const priceModel = require('../models/priceModel');

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const CITIES = ['Mumbai', 'Bengaluru', 'Delhi NCR', 'Chennai'];
const DEFAULT_FROM = '2026-04-01';
const DEFAULT_TO = '2026-06-30';

// Gemini may choose only these reporting tools. None accepts raw SQL or a table name.
const operationalTools = [
  {
    type: 'function',
    name: 'explain_fill_rate_change',
    description: 'Explains the latest-week fill-rate change for one sales region using delivered and ordered eaches, category drivers, and route drivers.',
    parameters: { type: 'object', properties: { region: { type: 'string', enum: REGIONS } }, required: ['region'] },
  },
  {
    type: 'function',
    name: 'get_service_performance',
    description: 'Gets Q1 FY 2026-27 service performance by region, warehouse, route, or outlet.',
    parameters: { type: 'object', properties: { group_by: { type: 'string', enum: ['region', 'warehouse', 'route', 'outlet'] } }, required: ['group_by'] },
  },
  {
    type: 'function', name: 'get_cold_chain_overview',
    description: 'Gets Q1 temperature excursions, near-expiry stock, and cold-chain breach returns.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function', name: 'get_money_overview',
    description: 'Gets Q1 freight cost per delivered case by carrier and return-credit leakage by category.',
    parameters: { type: 'object', properties: {} },
  },
  {
    type: 'function', name: 'get_price_position',
    description: 'Gets Kestrel MRP compared with the lowest observed competitor shelf price for one city.',
    parameters: { type: 'object', properties: { city: { type: 'string', enum: CITIES } }, required: ['city'] },
  },
];

function explainFillRateChange(region) {
  if (!REGIONS.includes(region)) throw new Error('Unsupported region');
  const latestDate = askModel.getLatestDataDate();
  const comparison = askModel.getFillRateComparison(region, latestDate);
  return {
    region,
    latest_week: comparison.find((row) => row.period === 'latest_week'),
    previous_week: comparison.find((row) => row.period === 'previous_week'),
    category_shortfall_drivers: askModel.getShortfallDrivers(region, latestDate),
    worst_routes_in_latest_week: askModel.getWorstRoutes(region, latestDate),
    metric_definition: 'Fill rate is delivered eaches divided by ordered eaches.',
    time_anchor: `Last week is the final seven days in source data, ending ${latestDate}.`,
  };
}

function executeOperationalTool(name, args = {}) {
  switch (name) {
    case 'explain_fill_rate_change': return explainFillRateChange(args.region);
    case 'get_service_performance':
      return serviceModel.getPerformance({ groupBy: args.group_by, from: DEFAULT_FROM, to: DEFAULT_TO });
    case 'get_cold_chain_overview':
      return {
        temperature_excursions: coldChainModel.getMonthlyExcursions(DEFAULT_FROM, DEFAULT_TO),
        near_expiry_stock: coldChainModel.getNearExpiryStock(DEFAULT_TO, 30),
        cold_chain_returns: coldChainModel.getColdChainReturns(DEFAULT_FROM, DEFAULT_TO),
      };
    case 'get_money_overview':
      return {
        freight_by_carrier: moneyModel.getFreightByCarrier(DEFAULT_FROM, DEFAULT_TO),
        return_leakage_by_category: moneyModel.getReturnLeakageByCategory(DEFAULT_FROM, DEFAULT_TO),
        invoice_sync_status: moneyModel.getInvoiceSyncStatus(),
        data_quality_warning: 'Invoices have no delivery ID; freight matching uses warehouse, route, and service date.',
      };
    case 'get_price_position': {
      if (!CITIES.includes(args.city)) throw new Error('Unsupported city');
      const bySku = priceModel.getPricePosition(args.city);
      return { city: args.city, by_sku: bySku, by_category: priceModel.summariseByCategory(bySku) };
    }
    default: throw new Error(`Tool ${name} is not allowed`);
  }
}

module.exports = { operationalTools, executeOperationalTool };

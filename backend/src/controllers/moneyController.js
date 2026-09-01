const moneyModel = require('../models/moneyModel');
const freightInvoiceSyncService = require('../services/freightInvoiceSyncService');

const DEFAULT_FROM = '2026-04-01';
const DEFAULT_TO = '2026-06-30';

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getDateRange(query) {
  const from = query.from || DEFAULT_FROM;
  const to = query.to || DEFAULT_TO;
  if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
    throw new Error('from and to must be valid YYYY-MM-DD dates, with from before to');
  }
  return { from, to };
}

async function syncFreightInvoices(request, response, next) {
  try {
    const { from, to } = getDateRange(request.query);
    const result = await freightInvoiceSyncService.syncFreightInvoices(from, to);
    response.json({ data: result });
  } catch (error) {
    next(error);
  }
}

function moneyOverview(request, response, next) {
  try {
    const { from, to } = getDateRange(request.query);
    const syncStatus = moneyModel.getInvoiceSyncStatus();
    response.json({
      data: {
        freight_by_carrier: moneyModel.getFreightByCarrier(from, to),
        return_leakage_by_category: moneyModel.getReturnLeakageByCategory(from, to),
      },
      meta: {
        from,
        to,
        invoice_sync_status: syncStatus,
        definitions: {
          freight_cost_per_case: 'Freight in rupees from invoices matched to deliveries, divided by delivered cases matched on warehouse, route, and service date.',
          return_leakage: 'Absolute credit-note value divided by prorated dispatched line value.',
        },
        data_quality_warning: 'Carrier invoices do not contain a delivery ID. Freight attribution is a warehouse-route-service-date match; unmatched invoices are reported.',
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { syncFreightInvoices, moneyOverview };

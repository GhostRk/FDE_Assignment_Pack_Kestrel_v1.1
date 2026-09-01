const serviceModel = require('../models/serviceModel');

const DEFAULT_FROM = '2026-04-01';
const DEFAULT_TO = '2026-06-30';

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function servicePerformance(request, response, next) {
  const groupBy = request.query.group_by || 'region';
  const from = request.query.from || DEFAULT_FROM;
  const to = request.query.to || DEFAULT_TO;

  try {
    if (!serviceModel.supportsGroupBy(groupBy)) {
      throw new Error('group_by must be one of: region, warehouse, route, outlet');
    }
    if (!isIsoDate(from) || !isIsoDate(to) || from > to) {
      throw new Error('from and to must be valid YYYY-MM-DD dates, with from before to');
    }

    response.json({
      data: serviceModel.getPerformance({ groupBy, from, to }),
      meta: {
        group_by: groupBy,
        from,
        to,
        quantity_unit: 'eaches',
        definitions: {
          fill_rate: 'Delivered eaches divided by ordered eaches.',
          strict_otif: 'Every order line must be fully delivered, and delay_minutes must be zero or less.',
          on_time_delivery: 'delay_minutes is zero or less.',
        },
        data_quality_warning: 'All completed source orders have at least one short line. Strict OTIF therefore returns 0.00% for every group.',
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { servicePerformance };

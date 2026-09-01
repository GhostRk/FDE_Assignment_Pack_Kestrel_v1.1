const askModel = require('../models/askModel');

const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const SUPPORTED_QUESTION = /why\s+did\s+fill\s+rate\s+drop\s+in\s+(north|south|east|west|central)\s+last\s+week\??/i;

function askQuestion(request, response, next) {
  try {
    const question = String(request.body?.question || '').trim();
    const match = question.match(SUPPORTED_QUESTION);
    if (!match) {
      response.status(422).json({
        error: 'I do not yet support that question.',
        supported_questions: REGIONS.map((region) => `Why did fill rate drop in ${region} last week?`),
      });
      return;
    }

    const region = `${match[1][0].toUpperCase()}${match[1].slice(1).toLowerCase()}`;
    const latestDate = askModel.getLatestDataDate();
    const comparison = askModel.getFillRateComparison(region, latestDate);
    const latest = comparison.find((row) => row.period === 'latest_week');
    const previous = comparison.find((row) => row.period === 'previous_week');
    const drivers = askModel.getShortfallDrivers(region, latestDate);
    const worstRoutes = askModel.getWorstRoutes(region, latestDate);
    const delta = Number((latest.fill_rate_pct - previous.fill_rate_pct).toFixed(2));
    const shortfallIncrease = latest.shortfall_eaches - previous.shortfall_eaches;
    const driverText = drivers
      .filter((driver) => driver.shortfall_change_eaches > 0)
      .map((driver) => `${driver.category} (+${driver.shortfall_change_eaches.toLocaleString()} eaches short)`)
      .join(', ');

    response.json({
      answer: `${region} fill rate was ${latest.fill_rate_pct}% from ${latest.from_date} to ${latest.to_date}, ${Math.abs(delta)} percentage points ${delta < 0 ? 'below' : 'above'} the prior week (${previous.fill_rate_pct}%). The shortfall changed by ${shortfallIncrease.toLocaleString()} eaches. The main category drivers were ${driverText || 'not increased shortfall categories'}.`,
      evidence: {
        region,
        latest_week: latest,
        previous_week: previous,
        category_shortfall_drivers: drivers,
        worst_routes_in_latest_week: worstRoutes,
      },
      meta: {
        metric: 'Fill rate is delivered eaches divided by ordered eaches.',
        time_anchor: `“Last week” is the final seven calendar days in the available source data, ending ${latestDate}.`,
      },
    });
  } catch (error) {
    next(error);
  }
}

module.exports = { askQuestion };

const sourceDb = require('../config/database');
const priceDb = require('../config/priceDatabase');

function productType(name) {
  return name.toLowerCase()
    .replace(/kestrel|bluepeak|hillfare|amrit(?:\s*valley|valley)?|marwar|coastline|select|sel\.?/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(g|ml|kg)\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function listingType(title) {
  return title.toLowerCase()
    .replace(/\|.*$/, ' ')
    .replace(/pack of \d+|combo|new|family pack|best before \d+m/gi, ' ')
    .replace(/kestrel|bluepeak|hillfare|amrit(?:\s*valley|valley)?|marwar|coastline|select|sel\.?/g, ' ')
    .replace(/\d+(?:\.\d+)?\s*(g|ml|kg)\b/g, ' ')
    .replace(/[^a-z]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function getPricePosition(city) {
  const products = sourceDb.prepare(`
    SELECT product_id, sku_code, product_name, category, pack_size_value, pack_size_uom, mrp_inr
    FROM products
    WHERE brand = 'Kestrel' AND status = 'ACTIVE'
  `).all();
  const listings = priceDb.prepare(`
    SELECT city, retailer, product_title, category, pack_size_value, pack_size_uom,
           price_paise, last_seen_date
    FROM competitor_listings
    WHERE city = ?
  `).all(city);

  const rows = [];
  for (const product of products) {
    const comparable = listings.filter((listing) => (
      listing.category === product.category
      && listing.pack_size_value === product.pack_size_value
      && listing.pack_size_uom === product.pack_size_uom
      && listingType(listing.product_title) === productType(product.product_name)
      && !listing.product_title.toLowerCase().includes('kestrel')
    ));
    if (comparable.length === 0) continue;

    const lowest = comparable.reduce((best, listing) => (listing.price_paise < best.price_paise ? listing : best));
    const lowestPriceInr = Number((lowest.price_paise / 100).toFixed(2));
    rows.push({
      sku_code: product.sku_code,
      product_name: product.product_name,
      category: product.category,
      mrp_inr: product.mrp_inr,
      lowest_competitor_price_inr: lowestPriceInr,
      price_gap_inr: Number((product.mrp_inr - lowestPriceInr).toFixed(2)),
      price_gap_pct_of_mrp: Number((100 * (product.mrp_inr - lowestPriceInr) / product.mrp_inr).toFixed(2)),
      competitor_retailer: lowest.retailer,
      competitor_product_title: lowest.product_title,
      last_seen_date: lowest.last_seen_date,
    });
  }

  return rows.sort((a, b) => b.price_gap_pct_of_mrp - a.price_gap_pct_of_mrp);
}

function getSyncStatus() {
  return priceDb.prepare(`
    SELECT COUNT(*) AS listing_count, MAX(synced_at_utc) AS last_synced_at_utc
    FROM competitor_listings
  `).get();
}

function summariseByCategory(rows) {
  const groups = new Map();
  for (const row of rows) {
    const group = groups.get(row.category) || {
      category: row.category,
      comparable_sku_count: 0,
      total_mrp_inr: 0,
      total_lowest_competitor_price_inr: 0,
      above_competitor_count: 0,
    };
    group.comparable_sku_count += 1;
    group.total_mrp_inr += row.mrp_inr;
    group.total_lowest_competitor_price_inr += row.lowest_competitor_price_inr;
    if (row.price_gap_inr > 0) group.above_competitor_count += 1;
    groups.set(row.category, group);
  }

  return [...groups.values()].map((group) => ({
    category: group.category,
    comparable_sku_count: group.comparable_sku_count,
    average_mrp_inr: Number((group.total_mrp_inr / group.comparable_sku_count).toFixed(2)),
    average_lowest_competitor_price_inr: Number((
      group.total_lowest_competitor_price_inr / group.comparable_sku_count
    ).toFixed(2)),
    average_price_gap_inr: Number((
      (group.total_mrp_inr - group.total_lowest_competitor_price_inr) / group.comparable_sku_count
    ).toFixed(2)),
    above_competitor_count: group.above_competitor_count,
  })).sort((left, right) => right.average_price_gap_inr - left.average_price_gap_inr);
}

module.exports = { getPricePosition, getSyncStatus, summariseByCategory };

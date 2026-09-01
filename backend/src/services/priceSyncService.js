const fs = require('node:fs');
const path = require('node:path');
const cheerio = require('cheerio');
const priceDb = require('../config/priceDatabase');

const SITE_DIRECTORY = process.env.BAZAARPULSE_SITE_DIR
  || path.join(__dirname, '..', '..', '..', 'bazaarpulse_site');

const CITY_PAGES = {
  Mumbai: { directory: 'city/mumbai/page', prefix: '' },
  Bengaluru: { directory: 'city/bengaluru', prefix: 'index' },
  'Delhi NCR': { directory: 'city/delhi/page', prefix: '' },
  Chennai: { directory: 'city/chennai', prefix: 'index' },
};

function cityFiles({ directory, prefix }) {
  const absoluteDirectory = path.join(SITE_DIRECTORY, directory);
  return fs.readdirSync(absoluteDirectory)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.html'))
    .sort((left, right) => left.localeCompare(right, undefined, { numeric: true }));
}

function parsePack(text) {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(g|ml|kg)\b/i);
  if (!match) return { packSizeValue: null, packSizeUom: null };
  return { packSizeValue: Number(match[1]), packSizeUom: match[2].toUpperCase() };
}

function parsePricePaise(item) {
  const attributeValue = item.find('.pricing-block').attr('data-price-paise');
  if (attributeValue) return Number(attributeValue);

  const text = item.find('.price, .amt, .sellingPrice').first().text();
  const match = text.match(/(\d+(?:\.\d+)?)/);
  return match ? Math.round(Number(match[1]) * 100) : Number.NaN;
}

function parsePage(filePath, city) {
  const $ = cheerio.load(fs.readFileSync(filePath, 'utf8'));
  const listings = [];

  $('.product-item').each((_, element) => {
    const item = $(element);
    const listingId = item.attr('data-listing-id');
    const productTitle = item.find('a strong').text().trim();
    const productPagePath = item.find('a').attr('href');
    const metadata = item.find('.muted').first().text().split('·').map((value) => value.trim());
    const retailer = metadata[0];
    const category = metadata[2];
    const pricePaise = parsePricePaise(item);
    const lastSeen = item.find('.muted').filter((_, node) => $(node).text().includes('Last seen:')).text()
      .replace('Last seen:', '').trim();
    const { packSizeValue, packSizeUom } = parsePack(`${productTitle} ${metadata[1] || ''}`);

    if (listingId && retailer && category && productTitle && productPagePath && Number.isFinite(pricePaise) && lastSeen) {
      listings.push({
        listingId, city, retailer, productTitle, category, packSizeValue, packSizeUom,
        pricePaise, lastSeen, productPagePath,
      });
    }
  });
  return listings;
}

const upsertListing = priceDb.prepare(`
  INSERT INTO competitor_listings (
    listing_id, city, retailer, product_title, category, pack_size_value,
    pack_size_uom, price_paise, last_seen_date, product_page_path, synced_at_utc
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(listing_id) DO UPDATE SET
    city = excluded.city, retailer = excluded.retailer, product_title = excluded.product_title,
    category = excluded.category, pack_size_value = excluded.pack_size_value,
    pack_size_uom = excluded.pack_size_uom, price_paise = excluded.price_paise,
    last_seen_date = excluded.last_seen_date, product_page_path = excluded.product_page_path,
    synced_at_utc = excluded.synced_at_utc
`);

function syncCompetitorPrices() {
  const listings = [];
  for (const [city, pageConfig] of Object.entries(CITY_PAGES)) {
    for (const filename of cityFiles(pageConfig)) {
      listings.push(...parsePage(path.join(SITE_DIRECTORY, pageConfig.directory, filename), city));
    }
  }

  const syncedAt = new Date().toISOString();
  priceDb.exec('BEGIN');
  try {
    for (const listing of listings) {
      upsertListing.run(
        listing.listingId, listing.city, listing.retailer, listing.productTitle,
        listing.category, listing.packSizeValue, listing.packSizeUom, listing.pricePaise,
        listing.lastSeen, listing.productPagePath, syncedAt,
      );
    }
    priceDb.exec('COMMIT');
  } catch (error) {
    priceDb.exec('ROLLBACK');
    throw error;
  }

  const stored = priceDb.prepare('SELECT COUNT(*) AS listing_count FROM competitor_listings').get();
  return { listing_count: stored.listing_count, city_count: Object.keys(CITY_PAGES).length, synced_at_utc: syncedAt };
}

module.exports = { syncCompetitorPrices };

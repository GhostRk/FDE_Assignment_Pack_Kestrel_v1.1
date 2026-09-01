const express = require('express');
const { syncCompetitorPrices, pricePosition } = require('../controllers/priceController');

const router = express.Router();

router.post('/sync-competitor-prices', syncCompetitorPrices);
router.get('/position', pricePosition);

module.exports = router;

const express = require('express');
const { syncFreightInvoices, moneyOverview } = require('../controllers/moneyController');

const router = express.Router();

router.post('/sync-freight-invoices', syncFreightInvoices);
router.get('/overview', moneyOverview);

module.exports = router;

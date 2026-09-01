const express = require('express');
const { coldChainOverview } = require('../controllers/coldChainController');

const router = express.Router();

router.get('/overview', coldChainOverview);

module.exports = router;

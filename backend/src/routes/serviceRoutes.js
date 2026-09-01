const express = require('express');
const { servicePerformance } = require('../controllers/serviceController');

const router = express.Router();

router.get('/performance', servicePerformance);

module.exports = router;

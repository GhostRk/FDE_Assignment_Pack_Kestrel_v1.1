const express = require('express');
const { askQuestion } = require('../controllers/askController');

const router = express.Router();

router.post('/', askQuestion);

module.exports = router;

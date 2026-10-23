const express = require('express');
const router = express.Router();
const { search, reverse } = require('../controllers/geocodingController');
const { routeSearchLimiter } = require('../middleware/rateLimiter');

router.get('/search', routeSearchLimiter, search);
router.get('/reverse', routeSearchLimiter, reverse);

module.exports = router;

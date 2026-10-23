const express = require('express');
const router = express.Router();
const { triggerSOS, cancelSOS, getMySOSHistory } = require('../controllers/sosController');
const { protect } = require('../middleware/auth');
const { sosLimiter } = require('../middleware/rateLimiter');

router.post('/trigger', protect, sosLimiter, triggerSOS);
router.post('/cancel/:id', protect, cancelSOS);
router.get('/my', protect, getMySOSHistory);

module.exports = router;

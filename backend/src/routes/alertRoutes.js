const express = require('express');
const router = express.Router();
const { getAlerts, createAlert } = require('../controllers/alertController');
const { protect, requireRole } = require('../middleware/auth');

router.get('/', getAlerts);
router.post('/', protect, requireRole('ADMIN'), createAlert);

module.exports = router;

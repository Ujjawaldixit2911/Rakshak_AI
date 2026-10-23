const express = require('express');
const router = express.Router();
const {
  getCrimes,
  getCrimeById,
  reportCrime,
  createCrime,
  updateCrime,
  deleteCrime
} = require('../controllers/crimeController');
const { protect, requireRole } = require('../middleware/auth');
const { crimeReportLimiter } = require('../middleware/rateLimiter');

router.get('/', getCrimes);
router.get('/:id', getCrimeById);
router.post('/report', protect, crimeReportLimiter, reportCrime);

// Admin-only endpoints
router.post('/', protect, requireRole('ADMIN'), createCrime);
router.put('/:id', protect, requireRole('ADMIN'), updateCrime);
router.delete('/:id', protect, requireRole('ADMIN'), deleteCrime);

module.exports = router;

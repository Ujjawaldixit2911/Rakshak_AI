const express = require('express');
const router = express.Router();
const {
  getAdminStats,
  getVerificationQueue,
  verifyReport,
  rejectReport,
  getHotspots,
  getModelMetadata
} = require('../controllers/adminController');
const { protect, requireRole } = require('../middleware/auth');

// Public or user hotspot endpoint
router.get('/hotspots', getHotspots);

// Admin-protected endpoints
router.use(protect);
router.use(requireRole('ADMIN'));

router.get('/stats', getAdminStats);
router.get('/verification-queue', getVerificationQueue);
router.post('/verify-report/:id', verifyReport);
router.post('/reject-report/:id', rejectReport);
router.get('/model-metadata', getModelMetadata);

module.exports = router;

const express = require('express');
const router = express.Router();
const {
  planRoutes,
  saveRoute,
  getSavedRoutes,
  deleteSavedRoute
} = require('../controllers/routeController');
const { protect, optionalProtect } = require('../middleware/auth');
const { routeSearchLimiter } = require('../middleware/rateLimiter');

router.post('/plan', routeSearchLimiter, optionalProtect, planRoutes);
router.post('/save', protect, saveRoute);
router.get('/saved', protect, getSavedRoutes);
router.delete('/saved/:id', protect, deleteSavedRoute);

module.exports = router;

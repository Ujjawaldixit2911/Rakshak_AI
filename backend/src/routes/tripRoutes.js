const express = require('express');
const router = express.Router();
const {
  startTrip,
  updateTripLocation,
  completeTrip,
  getTripHistory
} = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/start', startTrip);
router.post('/:id/location', updateTripLocation);
router.post('/:id/complete', completeTrip);
router.get('/', getTripHistory);

module.exports = router;

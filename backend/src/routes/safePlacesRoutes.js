const express = require('express');
const router = express.Router();
const { getSafePlaces } = require('../controllers/safePlacesController');

router.get('/', getSafePlaces);

module.exports = router;

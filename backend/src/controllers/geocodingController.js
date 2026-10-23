const { searchLocation, reverseGeocode } = require('../services/geocodingService');

const search = async (req, res, next) => {
  try {
    const { q, countrycodes = 'in', limit = 5 } = req.query;
    if (!q || q.trim().length < 2) {
      return res.status(200).json({ success: true, results: [] });
    }

    const results = await searchLocation(q, countrycodes, parseInt(limit, 10));
    res.status(200).json({
      success: true,
      count: results.length,
      results
    });
  } catch (err) {
    next(err);
  }
};

const reverse = async (req, res, next) => {
  try {
    const { lat, lng } = req.query;
    if (!lat || !lng) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude query parameters required' });
    }

    const result = await reverseGeocode(parseFloat(lat), parseFloat(lng));
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  search,
  reverse
};

const { getNearbySafePlaces } = require('../services/safePlacesService');

const getSafePlaces = async (req, res, next) => {
  try {
    const { lat, lng, radiusMeters = 5000, type } = req.query;

    if (!lat || !lng) {
      return res.status(400).json({
        success: false,
        error: 'Latitude (lat) and Longitude (lng) query parameters are required'
      });
    }

    const places = await getNearbySafePlaces(
      parseFloat(lat),
      parseFloat(lng),
      parseInt(radiusMeters, 10),
      type
    );

    res.status(200).json({
      success: true,
      count: places.length,
      data: places
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSafePlaces
};

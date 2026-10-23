const Alert = require('../models/Alert');

const getAlerts = async (req, res, next) => {
  try {
    const { lat, lng, radiusMeters = 10000, activeOnly = 'true' } = req.query;
    const query = {};

    if (activeOnly === 'true') {
      query.active = true;
      query.expiresAt = { $gt: new Date() };
    }

    if (lat && lng) {
      query.location = {
        $nearSphere: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(lng), parseFloat(lat)]
          },
          $maxDistance: parseFloat(radiusMeters)
        }
      };
    }

    const alerts = await Alert.find(query).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: alerts.length,
      data: alerts
    });
  } catch (err) {
    next(err);
  }
};

const createAlert = async (req, res, next) => {
  try {
    const { title, message, severity, category, latitude, longitude, radiusMeters, expiresHours, isDemo } = req.body;

    if (!title || !message || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Title, message, and location (latitude, longitude) required'
      });
    }

    const expiresAt = new Date(Date.now() + (parseInt(expiresHours, 10) || 24) * 60 * 60 * 1000);

    const alert = await Alert.create({
      title,
      message,
      severity: severity || 'MEDIUM',
      category: category || 'SAFETY_NOTICE',
      location: {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      },
      radiusMeters: radiusMeters || 500,
      expiresAt,
      isDemo: Boolean(isDemo)
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('alert:new', alert);
    }

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAlerts,
  createAlert
};

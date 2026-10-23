const mongoose = require('mongoose');
const Crime = require('../models/Crime');
const CrimeReport = require('../models/CrimeReport');
const { haversineDistanceMeters } = require('../services/geospatialService');

/**
 * @desc    Get crimes with filtering and spatial bounds
 * @route   GET /api/crimes
 * @access  Public
 */
const getCrimes = async (req, res, next) => {
  try {
    const {
      bbox, // minLng,minLat,maxLng,maxLat
      lat,
      lng,
      radiusMeters = 5000,
      category,
      severity,
      verificationStatus = 'VERIFIED',
      includeDemo = 'true',
      limit = 500
    } = req.query;

    const query = {};

    // 1. Spatial filter: Bounding Box or Point Radius
    if (bbox) {
      const [minLng, minLat, maxLng, maxLat] = bbox.split(',').map(parseFloat);
      if (!isNaN(minLng) && !isNaN(minLat) && !isNaN(maxLng) && !isNaN(maxLat)) {
        query.location = {
          $geoWithin: {
            $box: [
              [minLng, minLat],
              [maxLng, maxLat]
            ]
          }
        };
      }
    } else if (lat && lng) {
      const centerLat = parseFloat(lat);
      const centerLng = parseFloat(lng);
      const radius = parseFloat(radiusMeters);
      if (!isNaN(centerLat) && !isNaN(centerLng)) {
        query.location = {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [centerLng, centerLat]
            },
            $maxDistance: radius
          }
        };
      }
    }

    // 2. Attributes filters
    if (category) {
      query.category = category.toUpperCase();
    }
    if (severity) {
      query.severity = severity.toUpperCase();
    }
    if (verificationStatus && verificationStatus !== 'ALL') {
      query.verificationStatus = verificationStatus.toUpperCase();
    }
    if (includeDemo === 'false') {
      query.isDemo = false;
    }

    const crimes = await Crime.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit, 10))
      .lean();

    res.status(200).json({
      success: true,
      count: crimes.length,
      data: crimes
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get single crime details by ID
 * @route   GET /api/crimes/:id
 * @access  Public
 */
const getCrimeById = async (req, res, next) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { crimeId: req.params.id };

    const crime = await Crime.findOne(query);

    if (!crime) {
      return res.status(404).json({ success: false, error: 'Crime record not found' });
    }

    res.status(200).json({
      success: true,
      data: crime
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Submit a user community crime report (starts as PENDING)
 * @route   POST /api/crimes/report
 * @access  Private
 */
const reportCrime = async (req, res, next) => {
  try {
    const {
      crimeType,
      category,
      severity = 'MEDIUM',
      latitude,
      longitude,
      description,
      incidentDate
    } = req.body;

    if (!crimeType || !latitude || !longitude || !description) {
      return res.status(400).json({
        success: false,
        error: 'Please provide crime type, coordinates (latitude, longitude) and description'
      });
    }

    const report = await CrimeReport.create({
      userId: req.user.id,
      crimeType,
      category: category || 'OTHER',
      severity,
      latitude: parseFloat(latitude),
      longitude: parseFloat(longitude),
      description,
      incidentDate: incidentDate ? new Date(incidentDate) : new Date(),
      status: 'PENDING'
    });

    // Real-time notification if socket is attached
    if (req.app.get('io')) {
      req.app.get('io').to('admin:channel').emit('admin:new-report', {
        reportId: report.reportId,
        category: report.category,
        description: report.description,
        createdAt: report.createdAt
      });
    }

    res.status(201).json({
      success: true,
      message: 'Crime report submitted successfully and placed in verification queue.',
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Admin: Create new official or verified crime record with deduplication
 * @route   POST /api/crimes
 * @access  Private (ADMIN)
 */
const createCrime = async (req, res, next) => {
  try {
    const {
      crimeType,
      category,
      severity,
      latitude,
      longitude,
      description,
      date,
      time,
      source,
      sourceUrl,
      sourceType,
      verificationStatus,
      isDemo
    } = req.body;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Deduplication check: same category within ~150m and +/- 24 hours
    const incidentDate = date ? new Date(date) : new Date();
    const dayStart = new Date(incidentDate.getTime() - 24 * 60 * 60 * 1000);
    const dayEnd = new Date(incidentDate.getTime() + 24 * 60 * 60 * 1000);

    const nearbySameCategory = await Crime.find({
      category: category ? category.toUpperCase() : 'THEFT',
      date: { $gte: dayStart, $lte: dayEnd },
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 150
        }
      }
    });

    if (nearbySameCategory.length > 0) {
      return res.status(409).json({
        success: false,
        error: 'Potential duplicate crime record detected within 150m and 24 hours of existing incident.',
        existingIncidentId: nearbySameCategory[0].crimeId
      });
    }

    const crime = await Crime.create({
      crimeType,
      category: category ? category.toUpperCase() : 'THEFT',
      severity: severity ? severity.toUpperCase() : 'MEDIUM',
      latitude: lat,
      longitude: lng,
      description,
      date: incidentDate,
      time: time || '12:00',
      source: source || 'OFFICIAL LOG',
      sourceUrl: sourceUrl || '',
      sourceType: sourceType || 'OFFICIAL',
      verified: verificationStatus !== 'UNVERIFIED',
      verificationStatus: verificationStatus || 'VERIFIED',
      isDemo: Boolean(isDemo)
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('crime:new', {
        crimeId: crime.crimeId,
        category: crime.category,
        severity: crime.severity,
        lat: crime.latitude,
        lng: crime.longitude,
        isDemo: crime.isDemo
      });
    }

    res.status(201).json({
      success: true,
      data: crime
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Admin: Update crime
 * @route   PUT /api/crimes/:id
 * @access  Private (ADMIN)
 */
const updateCrime = async (req, res, next) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { crimeId: req.params.id };

    const crime = await Crime.findOneAndUpdate(
      query,
      req.body,
      { new: true, runValidators: true }
    );

    if (!crime) {
      return res.status(404).json({ success: false, error: 'Crime not found' });
    }

    res.status(200).json({ success: true, data: crime });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Admin: Delete crime
 * @route   DELETE /api/crimes/:id
 * @access  Private (ADMIN)
 */
const deleteCrime = async (req, res, next) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const query = isObjectId ? { _id: req.params.id } : { crimeId: req.params.id };

    const crime = await Crime.findOneAndDelete(query);

    if (!crime) {
      return res.status(404).json({ success: false, error: 'Crime not found' });
    }

    res.status(200).json({ success: true, message: 'Crime deleted successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCrimes,
  getCrimeById,
  reportCrime,
  createCrime,
  updateCrime,
  deleteCrime
};

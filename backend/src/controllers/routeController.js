const { planAndCompareRoutes } = require('../services/routingService');
const Route = require('../models/Route');

/**
 * @desc    Plan, compare and score multi-route alternatives
 * @route   POST /api/routes/plan
 * @access  Public (or Optional Auth)
 */
const planRoutes = async (req, res, next) => {
  try {
    const {
      origin,
      destination,
      safetyMode = 'BALANCED',
      safetySlider,
      includeDemo = true,
      corridorRadiusMeters = 500
    } = req.body;

    if (!origin || !destination || origin.lat === undefined || origin.lng === undefined || destination.lat === undefined || destination.lng === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Please provide valid origin and destination coordinates ({ lat, lng })'
      });
    }

    // Guard: Origin and destination are identical
    if (Math.abs(origin.lat - destination.lat) < 0.0001 && Math.abs(origin.lng - destination.lng) < 0.0001) {
      return res.status(400).json({
        success: false,
        error: 'Origin and destination cannot be identical locations'
      });
    }

    const result = await planAndCompareRoutes(origin, destination, {
      safetyMode,
      safetySlider: typeof safetySlider === 'number' ? safetySlider : null,
      includeDemo: includeDemo !== false,
      corridorRadiusMeters: parseInt(corridorRadiusMeters, 10) || 500
    });

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Save a route to user's saved routes
 * @route   POST /api/routes/save
 * @access  Private
 */
const saveRoute = async (req, res, next) => {
  try {
    const {
      name,
      sourceName,
      sourceCoords,
      destName,
      destCoords,
      distanceMeters,
      durationSeconds,
      geometry,
      overallRisk,
      riskLevel,
      safetyScore,
      confidence,
      reasons,
      labels
    } = req.body;

    if (!sourceName || !destName || !sourceCoords || !destCoords || !geometry) {
      return res.status(400).json({
        success: false,
        error: 'Missing required route metadata to save'
      });
    }

    const savedRoute = await Route.create({
      userId: req.user.id,
      name: name || `${sourceName} to ${destName}`,
      sourceName,
      sourceCoords,
      destName,
      destCoords,
      distanceMeters,
      durationSeconds,
      geometry,
      overallRisk: overallRisk || 20,
      riskLevel: riskLevel || 'LOW',
      safetyScore: safetyScore || 80,
      confidence: confidence || 0.8,
      reasons: reasons || [],
      labels: labels || ['Saved'],
      isSaved: true
    });

    res.status(201).json({
      success: true,
      message: 'Route saved successfully',
      data: savedRoute
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user's saved routes
 * @route   GET /api/routes/saved
 * @access  Private
 */
const getSavedRoutes = async (req, res, next) => {
  try {
    const routes = await Route.find({ userId: req.user.id, isSaved: true }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: routes.length,
      data: routes
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Delete a saved route
 * @route   DELETE /api/routes/saved/:id
 * @access  Private
 */
const deleteSavedRoute = async (req, res, next) => {
  try {
    const route = await Route.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!route) {
      return res.status(404).json({ success: false, error: 'Saved route not found or not owned by user' });
    }

    res.status(200).json({
      success: true,
      message: 'Route removed from saved list'
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  planRoutes,
  saveRoute,
  getSavedRoutes,
  deleteSavedRoute
};

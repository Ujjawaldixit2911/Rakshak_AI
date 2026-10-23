const Trip = require('../models/Trip');
const Route = require('../models/Route');
const { distanceToPolylineMeters } = require('../services/geospatialService');
const config = require('../config');

/**
 * @desc    Start a live monitored trip
 * @route   POST /api/trips/start
 * @access  Private
 */
const startTrip = async (req, res, next) => {
  try {
    const {
      routeId,
      startLocation,
      destinationLocation,
      safetyMode = 'BALANCED',
      checkInMinutes = 60
    } = req.body;

    if (!startLocation || !destinationLocation) {
      return res.status(400).json({
        success: false,
        error: 'Start and Destination locations required'
      });
    }

    const checkInDeadline = new Date(Date.now() + parseInt(checkInMinutes, 10) * 60 * 1000);

    const trip = await Trip.create({
      userId: req.user.id,
      routeId: routeId || null,
      startLocation,
      destinationLocation,
      currentLocation: {
        coordinates: startLocation.coordinates || [0, 0],
        updatedAt: new Date()
      },
      safetyMode,
      status: 'ACTIVE',
      checkInDeadline
    });

    res.status(201).json({
      success: true,
      message: 'Trip started. Safety monitoring and deviation detection active.',
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Update live position during trip & detect route deviations
 * @route   POST /api/trips/:id/location
 * @access  Private
 */
const updateTripLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ success: false, error: 'Latitude and Longitude required' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Active trip not found' });
    }

    if (trip.status !== 'ACTIVE') {
      return res.status(400).json({ success: false, error: `Trip is already ${trip.status}` });
    }

    trip.currentLocation = {
      coordinates: [parseFloat(lng), parseFloat(lat)],
      updatedAt: new Date()
    };

    let isDeviated = false;
    let distanceToRouteMeters = 0;

    // Check deviation if route was linked
    if (trip.routeId) {
      const route = await Route.findById(trip.routeId);
      if (route && route.geometry) {
        const coords = Array.isArray(route.geometry) ? route.geometry : [];
        if (coords.length > 1) {
          distanceToRouteMeters = distanceToPolylineMeters({ lat, lng }, coords);
          if (distanceToRouteMeters > config.DEVIATION_THRESHOLD_METERS) {
            isDeviated = true;
            trip.deviationCount += 1;
          }
        }
      }
    }

    await trip.save();

    // Broadcast update via Socket.IO
    const io = req.app.get('io');
    if (io) {
      io.to(`user:${req.user.id}`).emit('location:update', {
        tripId: trip.tripId,
        lat,
        lng,
        isDeviated,
        distanceToRouteMeters: Math.round(distanceToRouteMeters)
      });

      if (isDeviated) {
        io.to(`user:${req.user.id}`).emit('route:deviation', {
          tripId: trip.tripId,
          deviationDistance: Math.round(distanceToRouteMeters),
          message: 'Route deviation detected. Recomputing safety analysis from current location.'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: {
        tripId: trip.tripId,
        currentLocation: trip.currentLocation,
        isDeviated,
        distanceToRouteMeters: Math.round(distanceToRouteMeters),
        deviationCount: trip.deviationCount
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Complete a trip
 * @route   POST /api/trips/:id/complete
 * @access  Private
 */
const completeTrip = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, userId: req.user.id });
    if (!trip) {
      return res.status(404).json({ success: false, error: 'Trip not found' });
    }

    trip.status = 'COMPLETED';
    trip.completedAt = new Date();
    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Trip completed safely.',
      data: trip
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get trip history for current user
 * @route   GET /api/trips
 * @access  Private
 */
const getTripHistory = async (req, res, next) => {
  try {
    const trips = await Trip.find({ userId: req.user.id }).sort({ startedAt: -1 });
    res.status(200).json({
      success: true,
      count: trips.length,
      data: trips
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  startTrip,
  updateTripLocation,
  completeTrip,
  getTripHistory
};

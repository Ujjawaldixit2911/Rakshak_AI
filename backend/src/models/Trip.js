const mongoose = require('mongoose');

const tripSchema = new mongoose.Schema({
  tripId: {
    type: String,
    unique: true,
    required: true,
    default: () => `TRIP-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  routeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Route'
  },
  startLocation: {
    name: String,
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  destinationLocation: {
    name: String,
    coordinates: { type: [Number], required: true } // [lng, lat]
  },
  currentLocation: {
    coordinates: { type: [Number], default: [0, 0] },
    updatedAt: { type: Date, default: Date.now }
  },
  safetyMode: {
    type: String,
    enum: ['FAST', 'BALANCED', 'SAFE'],
    default: 'BALANCED'
  },
  status: {
    type: String,
    enum: ['ACTIVE', 'COMPLETED', 'ABORTED', 'SOS_TRIGGERED'],
    default: 'ACTIVE',
    index: true
  },
  deviationCount: {
    type: Number,
    default: 0
  },
  checkInDeadline: {
    type: Date
  },
  alertsEncountered: [{
    type: String
  }],
  startedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: {
    type: Date
  }
}, {
  timestamps: true
});

tripSchema.index({ userId: 1, status: 1 });

module.exports = mongoose.model('Trip', tripSchema);

const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  alertId: {
    type: String,
    unique: true,
    required: true,
    default: () => `ALERT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  title: {
    type: String,
    required: [true, 'Alert title is required'],
    trim: true
  },
  message: {
    type: String,
    required: [true, 'Alert message is required'],
    trim: true
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  category: {
    type: String,
    enum: ['CRIME_SPIKE', 'RECENT_INCIDENT', 'ROAD_HAZARD', 'PROTEST', 'SAFETY_NOTICE', 'WEATHER'],
    default: 'SAFETY_NOTICE'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true
    }
  },
  radiusMeters: {
    type: Number,
    default: 500
  },
  active: {
    type: Boolean,
    default: true,
    index: true
  },
  expiresAt: {
    type: Date,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // Default 24 hours
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

alertSchema.index({ location: '2dsphere' });
alertSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // Automatic TTL cleanup

module.exports = mongoose.model('Alert', alertSchema);

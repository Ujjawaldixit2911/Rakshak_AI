const mongoose = require('mongoose');

const routeSchema = new mongoose.Schema({
  routeId: {
    type: String,
    unique: true,
    required: true,
    default: () => `ROUTE-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  name: {
    type: String,
    default: 'Saved Route'
  },
  sourceName: {
    type: String,
    required: true
  },
  sourceCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  destName: {
    type: String,
    required: true
  },
  destCoords: {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true }
  },
  distanceMeters: {
    type: Number,
    required: true
  },
  durationSeconds: {
    type: Number,
    required: true
  },
  geometry: {
    type: mongoose.Schema.Types.Mixed, // GeoJSON LineString or encoded polyline
    required: true
  },
  overallRisk: {
    type: Number,
    min: 0,
    max: 100,
    required: true
  },
  riskLevel: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL', 'INSUFFICIENT_DATA'],
    default: 'LOW'
  },
  safetyScore: {
    type: Number,
    min: 0,
    max: 100
  },
  confidence: {
    type: Number,
    min: 0,
    max: 1
  },
  reasons: [
    {
      code: String,
      text: String,
      value: mongoose.Schema.Types.Mixed
    }
  ],
  labels: [{
    type: String
  }],
  isSaved: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

routeSchema.index({ userId: 1, isSaved: 1 });

module.exports = mongoose.model('Route', routeSchema);

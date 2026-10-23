const mongoose = require('mongoose');

const crimeSchema = new mongoose.Schema({
  crimeId: {
    type: String,
    unique: true,
    required: true,
    default: () => `CRIME-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  crimeType: {
    type: String,
    required: [true, 'Please specify a crime type (e.g., Street Robbery, Phone Snatching)'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Please specify category'],
    enum: [
      'THEFT',
      'ROBBERY',
      'ASSAULT',
      'BURGLARY',
      'SEXUAL_ASSAULT',
      'VEHICLE_THEFT',
      'VANDALISM',
      'FRAUD',
      'MURDER',
      'OTHER'
    ],
    default: 'THEFT'
  },
  severity: {
    type: String,
    required: [true, 'Please specify severity'],
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  latitude: {
    type: Number,
    required: [true, 'Latitude is required'],
    min: -90,
    max: 90
  },
  longitude: {
    type: Number,
    required: [true, 'Longitude is required'],
    min: -180,
    max: 180
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude] in GeoJSON format
      required: true
    }
  },
  description: {
    type: String,
    trim: true,
    default: ''
  },
  date: {
    type: Date,
    required: [true, 'Date of incident is required'],
    default: Date.now
  },
  time: {
    type: String,
    default: '12:00'
  },
  source: {
    type: String,
    required: true,
    default: 'OFFICIAL POLICE LOG'
  },
  sourceUrl: {
    type: String,
    default: ''
  },
  sourceType: {
    type: String,
    enum: ['OFFICIAL', 'NEWS', 'USER_REPORTED', 'OTHER'],
    default: 'OFFICIAL'
  },
  verified: {
    type: Boolean,
    default: true
  },
  verificationStatus: {
    type: String,
    enum: ['VERIFIED', 'UNVERIFIED', 'PENDING'],
    default: 'VERIFIED'
  },
  isDemo: {
    type: Boolean,
    default: false,
    index: true
  }
}, {
  timestamps: true
});

// Create 2dsphere index on location GeoJSON field
crimeSchema.index({ location: '2dsphere' });
crimeSchema.index({ date: -1 });
crimeSchema.index({ category: 1, severity: 1 });
crimeSchema.index({ verificationStatus: 1 });
crimeSchema.index({ isDemo: 1, verificationStatus: 1 });

// Ensure coordinates sync with latitude & longitude before saving
crimeSchema.pre('validate', function(next) {
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

module.exports = mongoose.model('Crime', crimeSchema);

const mongoose = require('mongoose');

const crimeReportSchema = new mongoose.Schema({
  reportId: {
    type: String,
    unique: true,
    required: true,
    default: () => `REPORT-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  crimeType: {
    type: String,
    required: [true, 'Crime type is required'],
    trim: true
  },
  category: {
    type: String,
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
    default: 'OTHER'
  },
  severity: {
    type: String,
    enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
    default: 'MEDIUM'
  },
  latitude: {
    type: Number,
    required: true
  },
  longitude: {
    type: Number,
    required: true
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [lng, lat]
      required: true
    }
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  incidentDate: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['PENDING', 'VERIFIED', 'REJECTED'],
    default: 'PENDING',
    index: true
  },
  adminNotes: {
    type: String,
    default: ''
  },
  isDemo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

crimeReportSchema.index({ location: '2dsphere' });

crimeReportSchema.pre('validate', function(next) {
  if (this.latitude !== undefined && this.longitude !== undefined) {
    this.location = {
      type: 'Point',
      coordinates: [this.longitude, this.latitude]
    };
  }
  next();
});

module.exports = mongoose.model('CrimeReport', crimeReportSchema);

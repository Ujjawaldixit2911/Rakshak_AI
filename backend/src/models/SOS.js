const mongoose = require('mongoose');

const sosSchema = new mongoose.Schema({
  sosId: {
    type: String,
    unique: true,
    required: true,
    default: () => `SOS-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  userName: {
    type: String,
    required: true
  },
  userPhone: {
    type: String,
    default: ''
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
  status: {
    type: String,
    enum: ['TRIGGERED', 'RESOLVED', 'CANCELLED'],
    default: 'TRIGGERED',
    index: true
  },
  emergencyContactsNotified: [
    {
      name: String,
      phone: String,
      notifiedAt: { type: Date, default: Date.now }
    }
  ],
  emergencyNumberDialed: {
    type: String,
    default: '112'
  },
  notes: {
    type: String,
    default: ''
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

sosSchema.index({ location: '2dsphere' });
sosSchema.index({ createdAt: -1 });

module.exports = mongoose.model('SOS', sosSchema);

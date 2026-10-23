const mongoose = require('mongoose');

const trustedContactSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Contact name is required'],
    trim: true
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    trim: true
  },
  relationship: {
    type: String,
    enum: ['FAMILY', 'FRIEND', 'PARTNER', 'COLLEAGUE', 'GUARDIAN', 'OTHER'],
    default: 'FAMILY'
  },
  active: {
    type: Boolean,
    default: true
  },
  notifyOnTripStart: {
    type: Boolean,
    default: true
  },
  notifyOnSos: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

trustedContactSchema.index({ userId: 1, phone: 1 }, { unique: true });

module.exports = mongoose.model('TrustedContact', trustedContactSchema);

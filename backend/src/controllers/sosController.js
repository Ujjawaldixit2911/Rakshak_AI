const mongoose = require('mongoose');
const SOS = require('../models/SOS');
const TrustedContact = require('../models/TrustedContact');
const config = require('../config');

/**
 * @desc    Trigger SOS Emergency Event
 * @route   POST /api/sos/trigger
 * @access  Private
 */
const triggerSOS = async (req, res, next) => {
  try {
    const { latitude, longitude, notes } = req.body;

    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Location coordinates (latitude, longitude) required to trigger SOS'
      });
    }

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);

    // Fetch active emergency contacts
    const contacts = await TrustedContact.find({
      userId: req.user.id,
      active: true,
      notifyOnSos: true
    });

    const notifiedContacts = contacts.map(c => ({
      name: c.name,
      phone: c.phone,
      notifiedAt: new Date()
    }));

    const sos = await SOS.create({
      userId: req.user.id,
      userName: req.user.name,
      userPhone: req.user.phone || '',
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      status: 'TRIGGERED',
      emergencyContactsNotified: notifiedContacts,
      emergencyNumberDialed: config.EMERGENCY_NUMBER,
      notes: notes || 'Emergency SOS triggered from mobile client'
    });

    // Real-time broadcast via Socket.IO
    const io = req.app.get('io');
    if (io) {
      // Broadcast to emergency admins
      io.to('admin:channel').emit('sos:created', {
        sosId: sos.sosId,
        userId: req.user.id,
        userName: req.user.name,
        userPhone: req.user.phone,
        location: { lat, lng },
        contactsNotifiedCount: notifiedContacts.length,
        createdAt: sos.createdAt
      });

      // Broadcast to user's dedicated socket room
      io.to(`user:${req.user.id}`).emit('sos:status', {
        status: 'TRIGGERED',
        sosId: sos.sosId
      });
    }

    res.status(201).json({
      success: true,
      message: 'Emergency SOS activated. Trusted contacts notified.',
      data: {
        sosId: sos.sosId,
        status: sos.status,
        emergencyNumber: config.EMERGENCY_NUMBER,
        contactsNotified: notifiedContacts.length,
        instructions: `In immediate life-threatening danger, call national emergency response ${config.EMERGENCY_NUMBER} directly.`
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Cancel SOS
 * @route   POST /api/sos/cancel/:id
 * @access  Private
 */
const cancelSOS = async (req, res, next) => {
  try {
    const isObjectId = mongoose.isValidObjectId(req.params.id);
    const query = {
      userId: req.user.id,
      ...(isObjectId ? { _id: req.params.id } : { sosId: req.params.id })
    };

    const sos = await SOS.findOne(query);

    if (!sos) {
      return res.status(404).json({ success: false, error: 'SOS record not found' });
    }

    sos.status = 'CANCELLED';
    sos.notes = req.body.reason || 'Cancelled by user';
    sos.resolvedAt = new Date();
    await sos.save();

    const io = req.app.get('io');
    if (io) {
      io.to('admin:channel').emit('sos:cancelled', { sosId: sos.sosId });
    }

    res.status(200).json({
      success: true,
      message: 'SOS emergency cancelled',
      data: sos
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get user's SOS history or active SOS
 * @route   GET /api/sos/my
 * @access  Private
 */
const getMySOSHistory = async (req, res, next) => {
  try {
    const records = await SOS.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: records.length,
      data: records
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  triggerSOS,
  cancelSOS,
  getMySOSHistory
};

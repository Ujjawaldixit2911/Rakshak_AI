const TrustedContact = require('../models/TrustedContact');

const getContacts = async (req, res, next) => {
  try {
    const contacts = await TrustedContact.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      count: contacts.length,
      data: contacts
    });
  } catch (err) {
    next(err);
  }
};

const addContact = async (req, res, next) => {
  try {
    const { name, phone, relationship, notifyOnTripStart, notifyOnSos } = req.body;

    if (!name || !phone) {
      return res.status(400).json({
        success: false,
        error: 'Please provide both contact name and phone number'
      });
    }

    // Basic phone validation
    const cleanPhone = phone.trim().replace(/[^\d+]/g, '');
    if (cleanPhone.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a valid telephone number'
      });
    }

    const existing = await TrustedContact.findOne({ userId: req.user.id, phone: cleanPhone });
    if (existing) {
      return res.status(400).json({
        success: false,
        error: 'A contact with this phone number is already registered'
      });
    }

    const contact = await TrustedContact.create({
      userId: req.user.id,
      name: name.trim(),
      phone: cleanPhone,
      relationship: relationship || 'FAMILY',
      notifyOnTripStart: notifyOnTripStart !== false,
      notifyOnSos: notifyOnSos !== false,
      active: true
    });

    res.status(201).json({
      success: true,
      data: contact
    });
  } catch (err) {
    next(err);
  }
};

const updateContact = async (req, res, next) => {
  try {
    const contact = await TrustedContact.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Trusted contact not found' });
    }

    res.status(200).json({ success: true, data: contact });
  } catch (err) {
    next(err);
  }
};

const deleteContact = async (req, res, next) => {
  try {
    const contact = await TrustedContact.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id
    });

    if (!contact) {
      return res.status(404).json({ success: false, error: 'Trusted contact not found' });
    }

    res.status(200).json({ success: true, message: 'Contact removed successfully' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getContacts,
  addContact,
  updateContact,
  deleteContact
};

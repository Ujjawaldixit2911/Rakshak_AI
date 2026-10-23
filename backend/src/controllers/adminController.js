const Crime = require('../models/Crime');
const CrimeReport = require('../models/CrimeReport');
const SOS = require('../models/SOS');
const User = require('../models/User');
const Alert = require('../models/Alert');
const ModelMetadata = require('../models/ModelMetadata');
const { computeHotspots, checkMLHealth } = require('../services/mlServiceClient');

/**
 * @desc    Admin System Analytics & Overview
 * @route   GET /api/admin/stats
 * @access  Private (ADMIN)
 */
const getAdminStats = async (req, res, next) => {
  try {
    const totalCrimes = await Crime.countDocuments();
    const demoCrimes = await Crime.countDocuments({ isDemo: true });
    const verifiedCrimes = await Crime.countDocuments({ verificationStatus: 'VERIFIED' });
    const unverifiedCrimes = await Crime.countDocuments({ verificationStatus: 'UNVERIFIED' });
    const pendingReports = await CrimeReport.countDocuments({ status: 'PENDING' });
    const activeSosCount = await SOS.countDocuments({ status: 'TRIGGERED' });
    const totalUsers = await User.countDocuments();
    const activeAlerts = await Alert.countDocuments({ active: true, expiresAt: { $gt: new Date() } });

    // Category breakdown
    const categoryAgg = await Crime.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Severity breakdown
    const severityAgg = await Crime.aggregate([
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);

    const mlHealth = await checkMLHealth();

    res.status(200).json({
      success: true,
      data: {
        totalCrimes,
        demoCrimes,
        verifiedCrimes,
        unverifiedCrimes,
        pendingReports,
        activeSosCount,
        totalUsers,
        activeAlerts,
        categories: categoryAgg,
        severities: severityAgg,
        mlServiceStatus: mlHealth
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get pending crime verification queue
 * @route   GET /api/admin/verification-queue
 * @access  Private (ADMIN)
 */
const getVerificationQueue = async (req, res, next) => {
  try {
    const reports = await CrimeReport.find({ status: 'PENDING' })
      .populate('userId', 'name email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: reports.length,
      data: reports
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Verify and approve a pending community crime report into official Crime collection
 * @route   POST /api/admin/verify-report/:id
 * @access  Private (ADMIN)
 */
const verifyReport = async (req, res, next) => {
  try {
    const report = await CrimeReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Crime report not found' });
    }

    if (report.status !== 'PENDING') {
      return res.status(400).json({ success: false, error: `Report is already ${report.status}` });
    }

    report.status = 'VERIFIED';
    report.adminNotes = req.body.adminNotes || 'Verified by system administrator';
    await report.save();

    // Create official Crime entry
    const newCrime = await Crime.create({
      crimeType: report.crimeType,
      category: report.category,
      severity: report.severity,
      latitude: report.latitude,
      longitude: report.longitude,
      description: report.description,
      date: report.incidentDate || report.createdAt,
      source: 'COMMUNITY REPORT (VERIFIED)',
      sourceType: 'USER_REPORTED',
      verified: true,
      verificationStatus: 'VERIFIED',
      isDemo: report.isDemo || false
    });

    const io = req.app.get('io');
    if (io) {
      io.emit('crime:new', {
        crimeId: newCrime.crimeId,
        category: newCrime.category,
        severity: newCrime.severity,
        lat: newCrime.latitude,
        lng: newCrime.longitude
      });
    }

    res.status(200).json({
      success: true,
      message: 'Report verified and incident added to safety database',
      data: {
        report,
        crime: newCrime
      }
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Reject a pending community crime report
 * @route   POST /api/admin/reject-report/:id
 * @access  Private (ADMIN)
 */
const rejectReport = async (req, res, next) => {
  try {
    const report = await CrimeReport.findById(req.params.id);
    if (!report) {
      return res.status(404).json({ success: false, error: 'Crime report not found' });
    }

    report.status = 'REJECTED';
    report.adminNotes = req.body.reason || 'Rejected by administrator: insufficient evidence or invalid location';
    await report.save();

    res.status(200).json({
      success: true,
      message: 'Report rejected',
      data: report
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get DBSCAN Hotspots
 * @route   GET /api/admin/hotspots
 * @access  Public (or Admin)
 */
const getHotspots = async (req, res, next) => {
  try {
    const crimes = await Crime.find({ verificationStatus: { $ne: 'REJECTED' } }).lean();
    const result = await computeHotspots(crimes);

    res.status(200).json({
      success: true,
      data: result.hotspots,
      available: result.available
    });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc    Get ML model metadata
 * @route   GET /api/admin/model-metadata
 * @access  Private (ADMIN)
 */
const getModelMetadata = async (req, res, next) => {
  try {
    const metadata = await ModelMetadata.find().sort({ trainedAt: -1 });
    const mlHealth = await checkMLHealth();

    res.status(200).json({
      success: true,
      serviceHealth: mlHealth,
      models: metadata
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAdminStats,
  getVerificationQueue,
  verifyReport,
  rejectReport,
  getHotspots,
  getModelMetadata
};

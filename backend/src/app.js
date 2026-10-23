const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const config = require('./config');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const { checkMLHealth } = require('./services/mlServiceClient');

// Route imports
const authRoutes = require('./routes/authRoutes');
const crimeRoutes = require('./routes/crimeRoutes');
const routeRoutes = require('./routes/routeRoutes');
const geocodingRoutes = require('./routes/geocodingRoutes');
const sosRoutes = require('./routes/sosRoutes');
const contactRoutes = require('./routes/contactRoutes');
const tripRoutes = require('./routes/tripRoutes');
const safePlacesRoutes = require('./routes/safePlacesRoutes');
const alertRoutes = require('./routes/alertRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();

// Security headers
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// CORS Configuration
app.use(cors({
  origin: [config.CLIENT_URL, 'http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsing
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

// Request logging (in non-test mode)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Global API rate limiting
app.use('/api', apiLimiter);

// Health check endpoint (Reports API, DB, and ML status)
app.get('/api/health', async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = dbState === 1 ? 'CONNECTED' : dbState === 2 ? 'CONNECTING' : 'DISCONNECTED';
  const mlStatus = await checkMLHealth();

  const isHealthy = dbState === 1;

  res.status(isHealthy ? 200 : 503).json({
    success: isHealthy,
    status: isHealthy ? 'HEALTHY' : 'DEGRADED',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    services: {
      api: { status: 'ONLINE', uptime: process.uptime() },
      database: { status: dbStatus, host: mongoose.connection.host || '127.0.0.1' },
      mlService: mlStatus
    },
    meta: {
      environment: config.NODE_ENV,
      disclaimer: 'Rakshak AI safety estimations are calculated based on historical and reported data. Not a safety guarantee.'
    }
  });
});

// Mount modular API routes
app.use('/api/auth', authRoutes);
app.use('/api/crimes', crimeRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/sos', sosRoutes);
app.use('/api/contacts', contactRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/safe-places', safePlacesRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/admin', adminRoutes);

// Catch 404 for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.originalUrl} not found on Rakshak AI API`
  });
});

// Centralized error handler middleware
app.use(errorHandler);

module.exports = app;

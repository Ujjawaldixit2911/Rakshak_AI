/**
 * Rakshak AI - Comprehensive Demo Data Seeder
 * Generates realistic, clearly labeled DEMO DATA incidents across Delhi NCR
 * All records strictly have `isDemo: true` and source: 'DEMO DATA'
 */
const path = require('path');
const backendNodeModules = path.join(__dirname, '../backend/node_modules');

const mongoose = require(path.join(backendNodeModules, 'mongoose'));
const config = require('../backend/src/config');
const User = require('../backend/src/models/User');
const Crime = require('../backend/src/models/Crime');
const Alert = require('../backend/src/models/Alert');
const TrustedContact = require('../backend/src/models/TrustedContact');
const ModelMetadata = require('../backend/src/models/ModelMetadata');

const DELHI_NCR_CENTERS = [
  { name: 'Connaught Place', lat: 28.6315, lng: 77.2167 },
  { name: 'Chandni Chowk', lat: 28.6506, lng: 77.2303 },
  { name: 'Hauz Khas Village', lat: 28.5535, lng: 77.1944 },
  { name: 'Lajpat Nagar', lat: 28.5700, lng: 77.2400 },
  { name: 'Karol Bagh', lat: 28.6520, lng: 77.1900 },
  { name: 'Saket District Centre', lat: 28.5244, lng: 77.2178 },
  { name: 'Noida Sector 18', lat: 28.5708, lng: 77.3261 },
  { name: 'Cyber Hub Gurgaon', lat: 28.4950, lng: 77.0890 },
  { name: 'Rohini Sector 10', lat: 28.7150, lng: 77.1150 },
  { name: 'Dwarka Sector 21', lat: 28.5520, lng: 77.0580 }
];

const CRIME_TYPES = [
  { type: 'Phone Snatching on Motorbike', category: 'THEFT', severity: 'MEDIUM' },
  { type: 'Pickpocketing in Crowded Market', category: 'THEFT', severity: 'LOW' },
  { type: 'Armed Mugging in Alley', category: 'ROBBERY', severity: 'HIGH' },
  { type: 'Vehicle Break-in / Stereo Stolen', category: 'VEHICLE_THEFT', severity: 'MEDIUM' },
  { type: 'Night Physical Assault', category: 'ASSAULT', severity: 'HIGH' },
  { type: 'Stalking / Harassment Incident', category: 'SEXUAL_ASSAULT', severity: 'CRITICAL' },
  { type: 'Shop Window Vandalism', category: 'VANDALISM', severity: 'LOW' },
  { type: 'ATM Skimming Device Found', category: 'FRAUD', severity: 'LOW' }
];

async function seedDatabase() {
  console.log(`[Seed Script] Connecting to MongoDB at ${config.MONGO_URI}...`);
  await mongoose.connect(config.MONGO_URI);
  console.log('[Seed Script] Connected successfully.');

  // Clean demo data
  await Crime.deleteMany({ isDemo: true });
  await Alert.deleteMany({ isDemo: true });
  console.log('[Seed Script] Cleaned previous demo records.');

  // Seed Default Admin and User
  let adminUser = await User.findOne({ email: 'admin@rakshakai.org' });
  if (!adminUser) {
    adminUser = await User.create({
      name: 'Rakshak Admin Officer',
      email: 'admin@rakshakai.org',
      password: 'AdminPassword123!',
      role: 'ADMIN',
      phone: '+919999900000'
    });
    console.log('[Seed Script] Created default ADMIN account: admin@rakshakai.org / AdminPassword123!');
  }

  let demoUser = await User.findOne({ email: 'user@rakshakai.org' });
  if (!demoUser) {
    demoUser = await User.create({
      name: 'Pooja Sharma',
      email: 'user@rakshakai.org',
      password: 'UserPassword123!',
      role: 'USER',
      phone: '+919876543210'
    });
    console.log('[Seed Script] Created default USER account: user@rakshakai.org / UserPassword123!');

    // Add trusted contacts for demo user
    await TrustedContact.create([
      {
        userId: demoUser._id,
        name: 'Sunita Sharma (Mother)',
        phone: '+919811122233',
        relationship: 'FAMILY',
        notifyOnSos: true,
        notifyOnTripStart: true
      },
      {
        userId: demoUser._id,
        name: 'Rahul Verma (Friend)',
        phone: '+919822233344',
        relationship: 'FRIEND',
        notifyOnSos: true,
        notifyOnTripStart: false
      }
    ]);
  }

  // Generate 120 synthetic crime records clustered around Delhi NCR hubs
  const demoCrimes = [];
  const now = Date.now();

  for (let i = 0; i < 120; i++) {
    const hub = DELHI_NCR_CENTERS[i % DELHI_NCR_CENTERS.length];
    const template = CRIME_TYPES[i % CRIME_TYPES.length];

    // Scatter within 1.5 km of hub
    const latOffset = (Math.random() - 0.5) * 0.025;
    const lngOffset = (Math.random() - 0.5) * 0.025;
    const lat = hub.lat + latOffset;
    const lng = hub.lng + lngOffset;

    // Date spread over last 180 days
    const daysAgo = Math.floor(Math.random() * 180);
    const incidentDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000);

    demoCrimes.push({
      crimeType: template.type,
      category: template.category,
      severity: template.severity,
      latitude: Math.round(lat * 100000) / 100000,
      longitude: Math.round(lng * 100000) / 100000,
      location: {
        type: 'Point',
        coordinates: [Math.round(lng * 100000) / 100000, Math.round(lat * 100000) / 100000]
      },
      description: `[DEMO DATA] Reported ${template.type.toLowerCase()} in vicinity of ${hub.name}.`,
      date: incidentDate,
      time: `${Math.floor(Math.random() * 24).toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      source: 'DEMO DATA',
      sourceType: 'OFFICIAL',
      verified: true,
      verificationStatus: 'VERIFIED',
      isDemo: true
    });
  }

  await Crime.insertMany(demoCrimes);
  console.log(`[Seed Script] Inserted ${demoCrimes.length} DEMO DATA crime records across 10 Delhi NCR zones.`);

  // Seed sample active safety alerts
  await Alert.create([
    {
      title: 'Night Streetlight Maintenance',
      message: 'Multiple streetlights non-operational along Ring Road between AIIMS and Moolchand.',
      severity: 'MEDIUM',
      category: 'ROAD_HAZARD',
      location: { type: 'Point', coordinates: [77.2200, 28.5700] },
      radiusMeters: 800,
      active: true,
      expiresAt: new Date(now + 48 * 60 * 60 * 1000),
      isDemo: true
    },
    {
      title: 'Recent Late-Night Snatching Spike',
      message: '3 phone snatching incidents reported past 48h near metro gate 2.',
      severity: 'HIGH',
      category: 'CRIME_SPIKE',
      location: { type: 'Point', coordinates: [77.2167, 28.6315] },
      radiusMeters: 500,
      active: true,
      expiresAt: new Date(now + 72 * 60 * 60 * 1000),
      isDemo: true
    }
  ]);
  console.log('[Seed Script] Inserted active DEMO safety alerts.');

  // Update ModelMetadata record in MongoDB
  await ModelMetadata.findOneAndUpdate(
    { modelVersion: '1.0.0-rf-demo' },
    {
      modelVersion: '1.0.0-rf-demo',
      modelType: 'RandomForestRegressor',
      datasetSize: 3000,
      features: ['latitude', 'longitude', 'crimeDensity', 'historicalCrimeCount', 'hour', 'dayOfWeek', 'isWeekend', 'isNight'],
      metrics: { mae: 3.05, rmse: 3.85, r2: 0.976 },
      isDemo: true,
      active: true
    },
    { upsert: true }
  );

  console.log('[Seed Script] Successfully seeded demo database. Disconnecting.');
  await mongoose.disconnect();
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = seedDatabase;

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Crime = require('../src/models/Crime');
const CrimeReport = require('../src/models/CrimeReport');

beforeAll(async () => {
  const testUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/rakshak_ai_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await Crime.deleteMany({ isDemo: true });
    await User.deleteMany({ email: /test-crime-.*@rakshak\.org/ });
    await mongoose.connection.close();
  }
});

describe('Crime Database & Geospatial API Suite (Phases 3, 6, 7)', () => {
  let userToken = '';
  let adminToken = '';

  beforeAll(async () => {
    // Create test user and admin
    const user = await User.create({
      name: 'Crime Reporter',
      email: `test-crime-user-${Date.now()}@rakshak.org`,
      password: 'Password123!',
      role: 'USER'
    });
    userToken = user.getSignedJwtToken();

    const admin = await User.create({
      name: 'Crime Inspector Admin',
      email: `test-crime-admin-${Date.now()}@rakshak.org`,
      password: 'Password123!',
      role: 'ADMIN'
    });
    adminToken = admin.getSignedJwtToken();

    // Create seed demo crimes
    await Crime.create([
      {
        crimeType: 'Snatching',
        category: 'THEFT',
        severity: 'MEDIUM',
        latitude: 28.6139,
        longitude: 77.2090,
        description: 'Demo phone snatching incident near metro station',
        source: 'DEMO DATA',
        isDemo: true,
        verificationStatus: 'VERIFIED'
      },
      {
        crimeType: 'Night Armed Robbery',
        category: 'ROBBERY',
        severity: 'HIGH',
        latitude: 28.6150,
        longitude: 77.2100,
        description: 'Demo robbery incident',
        source: 'DEMO DATA',
        isDemo: true,
        verificationStatus: 'VERIFIED'
      }
    ]);
  });

  test('GET /api/crimes - Returns list of crimes with DEMO DATA indicators', async () => {
    const res = await request(app).get('/api/crimes?includeDemo=true');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0].location.type).toBe('Point');
  });

  test('GET /api/crimes - Filters by bounding box correctly', async () => {
    const res = await request(app).get('/api/crimes?bbox=77.200,28.600,77.220,28.620');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('POST /api/crimes/report - User can submit community crime report (PENDING)', async () => {
    const res = await request(app)
      .post('/api/crimes/report')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        crimeType: 'Bag Thefts',
        category: 'THEFT',
        severity: 'LOW',
        latitude: 28.6200,
        longitude: 77.2150,
        description: 'Observed bag snatching incident on market road'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('PENDING');
  });

  test('POST /api/crimes - Admin can create crime with deduplication check', async () => {
    const lat = 28.6300;
    const lng = 77.2250;

    const res1 = await request(app)
      .post('/api/crimes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        crimeType: 'Vandalism Incident',
        category: 'VANDALISM',
        severity: 'LOW',
        latitude: lat,
        longitude: lng,
        description: 'Public property graffiti and damage',
        isDemo: true
      });

    expect(res1.statusCode).toBe(201);
    expect(res1.body.success).toBe(true);

    // Duplicate check on same spot & category
    const resDuplicate = await request(app)
      .post('/api/crimes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        crimeType: 'Vandalism Incident',
        category: 'VANDALISM',
        severity: 'LOW',
        latitude: lat,
        longitude: lng,
        description: 'Duplicate attempt'
      });

    expect(resDuplicate.statusCode).toBe(409);
    expect(resDuplicate.body.success).toBe(false);
  });
});

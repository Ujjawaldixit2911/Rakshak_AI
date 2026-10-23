const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

beforeAll(async () => {
  const testUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/rakshak_ai_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await User.deleteMany({ email: /test-auth-.*@rakshak\.org/ });
    await mongoose.connection.close();
  }
});

describe('Authentication & Authorization Suite (Phases 1 & 2)', () => {
  const testEmail = `test-auth-${Date.now()}@rakshak.org`;
  let userToken = '';
  let adminToken = '';

  test('POST /api/auth/register - Register standard user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Test Explorer',
        email: testEmail,
        password: 'Password123!',
        phone: '+919876543210'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testEmail);
    expect(res.body.user.role).toBe('USER');
    userToken = res.body.token;
  });

  test('POST /api/auth/register - Rejects duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Duplicate Explorer',
        email: testEmail,
        password: 'Password123!'
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/auth/login - Successfully login with valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'Password123!'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
  });

  test('POST /api/auth/login - Rejects invalid password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testEmail,
        password: 'WrongPassword999'
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/auth/me - Access protected endpoint with valid JWT', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testEmail);
  });

  test('GET /api/auth/me - Rejects request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('Admin endpoint rejects normal USER with 403 Forbidden', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });
});

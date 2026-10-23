const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');

beforeAll(async () => {
  const testUri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/rakshak_ai_test';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(testUri);
  }
});

afterAll(async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
});

describe('Multi-Route Planning & Explainability Suite (Phases 4, 5, 8, 9, 10)', () => {
  const origin = { lat: 28.6139, lng: 77.2090, name: 'Connaught Place' };
  const destination = { lat: 28.5355, lng: 77.3910, name: 'Noida City Center' };

  test('POST /api/routes/plan - Generates and compares multi-route alternatives', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({
        origin,
        destination,
        safetyMode: 'BALANCED'
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.routes.length).toBeGreaterThanOrEqual(1);

    const recommended = res.body.data.routes.find(r => r.routeId === res.body.data.recommendedRouteId);
    expect(recommended).toBeDefined();
    expect(recommended.reasons).toBeDefined();
    expect(Array.isArray(recommended.reasons)).toBe(true);
    expect(recommended.overallRisk).toBeGreaterThanOrEqual(0);
    expect(recommended.overallRisk).toBeLessThanOrEqual(100);
  });

  test('POST /api/routes/plan - Handles identical source and destination with 400', async () => {
    const res = await request(app)
      .post('/api/routes/plan')
      .send({
        origin: { lat: 28.6139, lng: 77.2090 },
        destination: { lat: 28.6139, lng: 77.2090 }
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  test('POST /api/routes/plan - Continuous safety slider shifts recommendation balance', async () => {
    const resSafe = await request(app)
      .post('/api/routes/plan')
      .send({
        origin,
        destination,
        safetySlider: 0.95 // Maximum safety priority
      });

    expect(resSafe.statusCode).toBe(200);
    expect(resSafe.body.data.weightsApplied.wSafety).toBe(0.95);
    expect(resSafe.body.data.weightsApplied.wTime).toBeCloseTo(0.05, 2);
  });
});

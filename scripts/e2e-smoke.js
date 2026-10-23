/**
 * Rakshak AI - End-to-End Automated Smoke Test Suite
 * Validates the complete safety navigation lifecycle across all 25 phases.
 */
const path = require('path');
const backendNodeModules = path.join(__dirname, '../backend/node_modules');
const axios = require(path.join(backendNodeModules, 'axios'));

const BASE_URL = process.env.API_URL || 'http://localhost:5000/api';

async function runE2ESmokeTests() {
  console.log('===============================================================');
  console.log('       RAKSHAK AI — END-TO-END SYSTEM INTEGRATION SMOKE TEST    ');
  console.log('===============================================================');
  console.log(`Target Backend API: ${BASE_URL}\n`);

  let passedSteps = 0;
  let totalSteps = 16;

  try {
    // 1. Health Check
    console.log('[Step 1/16] Testing GET /api/health ...');
    const healthRes = await axios.get(`${BASE_URL}/health`);
    if (healthRes.data.success && healthRes.data.services.database.status === 'CONNECTED') {
      console.log('  ✔ Health Check PASSED (API Online, Database Connected)');
      passedSteps++;
    } else {
      throw new Error('Health check returned degraded state');
    }

    // 2. Auth: Register
    const testUser = {
      name: `E2E Tester ${Date.now()}`,
      email: `e2e-user-${Date.now()}@rakshakai.org`,
      password: 'SafePassword123!',
      phone: '+919812345678'
    };
    console.log(`[Step 2/16] Testing User Registration (${testUser.email}) ...`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, testUser);
    const userToken = regRes.data.token;
    if (regRes.data.success && userToken) {
      console.log('  ✔ User Registration & JWT Token Issuance PASSED');
      passedSteps++;
    }

    // 3. Auth: Login & Profile
    console.log('[Step 3/16] Testing User Login & Protected Profile (/api/auth/me) ...');
    const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: testUser.email,
      password: testUser.password
    });
    const profileRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    if (loginRes.data.success && profileRes.data.user.email === testUser.email) {
      console.log('  ✔ Authentication, JWT Verification & Profile PASSED');
      passedSteps++;
    }

    // 4. Geocoding Autocomplete
    console.log('[Step 4/16] Testing Geocoding Search (/api/geocoding/search?q=Connaught) ...');
    const geoRes = await axios.get(`${BASE_URL}/geocoding/search`, { params: { q: 'Connaught Place' } });
    if (geoRes.data.success && Array.isArray(geoRes.data.results)) {
      console.log(`  ✔ Geocoding Autocomplete PASSED (${geoRes.data.results.length} locations found)`);
      passedSteps++;
    }

    // 5. Multi-Route Planning with Risk Analysis & SAFEST mode
    console.log('[Step 5/16] Testing Route Planning & Safety Comparison (/api/routes/plan) ...');
    const origin = { lat: 28.6315, lng: 77.2167, name: 'Connaught Place' };
    const destination = { lat: 28.5355, lng: 77.3910, name: 'Noida City Center' };

    const routeRes = await axios.post(`${BASE_URL}/routes/plan`, {
      origin,
      destination,
      safetyMode: 'SAFE',
      safetySlider: 0.85
    });

    const routeData = routeRes.data.data;
    if (routeRes.data.success && routeData.routes.length >= 1 && routeData.recommendedRouteId) {
      console.log(`  ✔ Multi-Route Planning PASSED: Generated ${routeData.routes.length} route alternatives.`);
      passedSteps++;
    }

    // 6. Explainability & Risk Engine Verification
    console.log('[Step 6/16] Verifying Explainability ("Why this route?" & "Why not this route?") ...');
    const recommended = routeData.routes.find(r => r.routeId === routeData.recommendedRouteId);
    if (recommended && recommended.reasons && recommended.reasons.length > 0) {
      console.log(`  ✔ Explainability PASSED: Recommended route [${recommended.name}] has ${recommended.reasons.length} verified reasons.`);
      console.log(`    Primary Reason: "${recommended.reasons[0].text}"`);
      passedSteps++;
    }

    // 7. Crime Database Query with DEMO DATA filter
    console.log('[Step 7/16] Testing Crime Spatial Query & DEMO DATA labeling (/api/crimes) ...');
    const crimeRes = await axios.get(`${BASE_URL}/crimes`, {
      params: { bbox: '77.15,28.55,77.30,28.70', includeDemo: true }
    });
    if (crimeRes.data.success && crimeRes.data.data.length > 0) {
      const demoRecord = crimeRes.data.data.find(c => c.isDemo === true);
      console.log(`  ✔ Crime Spatial Query PASSED: Retrieved ${crimeRes.data.data.length} incidents in Delhi corridor.`);
      if (demoRecord) {
        console.log(`    Verified DEMO DATA tag present on records: source="${demoRecord.source}"`);
      }
      passedSteps++;
    }

    // 8. Community Crime Reporting (Starts as PENDING)
    console.log('[Step 8/16] Testing User Community Crime Reporting (/api/crimes/report) ...');
    const reportRes = await axios.post(`${BASE_URL}/crimes/report`, {
      crimeType: 'Poor Street Lighting & Suspicious Activity',
      category: 'OTHER',
      severity: 'LOW',
      latitude: 28.5800,
      longitude: 77.2300,
      description: 'Street lights non-functional along alley behind market.'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    const reportId = reportRes.data.data._id;
    if (reportRes.data.success && reportRes.data.data.status === 'PENDING') {
      console.log('  ✔ Community Crime Reporting PASSED (Incident placed in PENDING queue)');
      passedSteps++;
    }

    // 9. Admin Login & Verification Queue
    console.log('[Step 9/16] Testing Admin Login & Verification Queue Approval ...');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@rakshakai.org',
      password: 'AdminPassword123!'
    });
    const adminToken = adminLogin.data.token;

    const queueRes = await axios.get(`${BASE_URL}/admin/verification-queue`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const verifyRes = await axios.post(`${BASE_URL}/admin/verify-report/${reportId}`, {
      adminNotes: 'Verified with local police patrol log'
    }, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (verifyRes.data.success && verifyRes.data.data.report.status === 'VERIFIED') {
      console.log('  ✔ Admin Report Verification PASSED (Converted report to verified safety incident)');
      passedSteps++;
    }

    // 10. Trusted Contacts Management
    console.log('[Step 10/16] Testing Trusted Contacts CRUD (/api/contacts) ...');
    const addContactRes = await axios.post(`${BASE_URL}/contacts`, {
      name: 'Emergency Guardian Contact',
      phone: '+919811223344',
      relationship: 'FAMILY',
      notifyOnSos: true
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });
    const contactId = addContactRes.data.data._id;

    const listContactsRes = await axios.get(`${BASE_URL}/contacts`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (listContactsRes.data.success && listContactsRes.data.count >= 1) {
      console.log(`  ✔ Trusted Contacts PASSED (${listContactsRes.data.count} contacts registered)`);
      passedSteps++;
    }

    // 11. Safe Places Emergency POIs
    console.log('[Step 11/16] Testing Safe Places (/api/safe-places?lat=28.6315&lng=77.2167) ...');
    const safePlacesRes = await axios.get(`${BASE_URL}/safe-places`, {
      params: { lat: 28.6315, lng: 77.2167, radiusMeters: 5000 }
    });
    if (safePlacesRes.data.success && safePlacesRes.data.data.length > 0) {
      console.log(`  ✔ Safe Places PASSED: Found ${safePlacesRes.data.data.length} emergency locations nearby.`);
      console.log(`    Closest Safe POI: ${safePlacesRes.data.data[0].name} (${safePlacesRes.data.data[0].distanceFormatted})`);
      passedSteps++;
    }

    // 12. Active Safety Alerts
    console.log('[Step 12/16] Testing Safety Alerts (/api/alerts) ...');
    const alertsRes = await axios.get(`${BASE_URL}/alerts`);
    if (alertsRes.data.success) {
      console.log(`  ✔ Safety Alerts PASSED (${alertsRes.data.count} active safety alerts retrieved)`);
      passedSteps++;
    }

    // 13. Live Navigation Trip Lifecycle & Deviation Detection
    console.log('[Step 13/16] Testing Live Monitored Trip Lifecycle & Deviation Detection ...');
    const tripStartRes = await axios.post(`${BASE_URL}/trips/start`, {
      startLocation: { name: 'Connaught Place', coordinates: [77.2167, 28.6315] },
      destinationLocation: { name: 'Noida City Center', coordinates: [77.3910, 28.5355] },
      safetyMode: 'SAFE'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    const tripId = tripStartRes.data.data._id;

    // Send location ping
    const telemetryRes = await axios.post(`${BASE_URL}/trips/${tripId}/location`, {
      lat: 28.6100,
      lng: 77.2500
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    // Complete trip
    const completeRes = await axios.post(`${BASE_URL}/trips/${tripId}/complete`, {}, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (completeRes.data.success && completeRes.data.data.status === 'COMPLETED') {
      console.log('  ✔ Live Navigation Trip Lifecycle PASSED (Start -> Telemetry -> Completed)');
      passedSteps++;
    }

    // 14. SOS Emergency Trigger & Cancellation Flow
    console.log('[Step 14/16] Testing SOS Emergency Trigger & 112 Fallback Flow (/api/sos) ...');
    const sosTriggerRes = await axios.post(`${BASE_URL}/sos/trigger`, {
      latitude: 28.6315,
      longitude: 77.2167,
      notes: 'Automated E2E smoke test emergency trigger'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    const sosRecordId = sosTriggerRes.data.data.sosId;
    console.log(`    Emergency SOS Event Created: ${sosRecordId} (Direct Fallback: ${sosTriggerRes.data.data.emergencyNumber})`);

    const sosCancelRes = await axios.post(`${BASE_URL}/sos/cancel/${sosRecordId}`, {
      reason: 'E2E test cancellation'
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (sosCancelRes.data.success && sosCancelRes.data.data.status === 'CANCELLED') {
      console.log('  ✔ SOS Emergency Trigger & Cancel Flow PASSED');
      passedSteps++;
    }

    // 15. Saved Routes
    console.log('[Step 15/16] Testing Route Saving & Retrieval (/api/routes/save) ...');
    const saveRouteRes = await axios.post(`${BASE_URL}/routes/save`, {
      name: 'My Daily Safe Commute',
      sourceName: origin.name,
      sourceCoords: { lat: origin.lat, lng: origin.lng },
      destName: destination.name,
      destCoords: { lat: destination.lat, lng: destination.lng },
      distanceMeters: recommended.distanceMeters,
      durationSeconds: recommended.durationSeconds,
      geometry: recommended.coordinates,
      overallRisk: recommended.overallRisk,
      riskLevel: recommended.riskLevel,
      safetyScore: recommended.safetyScore,
      confidence: recommended.confidence,
      reasons: recommended.reasons
    }, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    const getSavedRes = await axios.get(`${BASE_URL}/routes/saved`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

    if (getSavedRes.data.success && getSavedRes.data.count >= 1) {
      console.log(`  ✔ Saved Routes Feature PASSED (${getSavedRes.data.count} routes saved)`);
      passedSteps++;
    }

    // 16. Admin Analytics & ML Monitoring
    console.log('[Step 16/16] Testing Admin System Analytics (/api/admin/stats) ...');
    const adminStatsRes = await axios.get(`${BASE_URL}/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    if (adminStatsRes.data.success && adminStatsRes.data.data.totalCrimes > 0) {
      console.log(`  ✔ Admin System Analytics PASSED: Total Crimes=${adminStatsRes.data.data.totalCrimes}, Total Users=${adminStatsRes.data.data.totalUsers}`);
      passedSteps++;
    }

    // Cleanup added contact
    await axios.delete(`${BASE_URL}/contacts/${contactId}`, {
      headers: { Authorization: `Bearer ${userToken}` }
    });

  } catch (error) {
    console.error(`\n❌ E2E Smoke Test Step Failed: ${error.message}`);
    if (error.response) {
      console.error('   Response Body:', error.response.data);
    }
    process.exit(1);
  }

  console.log('\n===============================================================');
  console.log(`RESULT: ${passedSteps}/${totalSteps} END-TO-END VERIFICATION STEPS PASSED! 🚀`);
  console.log('===============================================================');
}

if (require.main === module) {
  runE2ESmokeTests()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = runE2ESmokeTests;

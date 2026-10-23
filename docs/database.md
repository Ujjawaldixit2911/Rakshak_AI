# RAKSHAK AI — DATABASE SCHEMA & ARCHITECTURE

## Database Engine
MongoDB with Mongoose ODM and `2dsphere` geospatial indexing.

## Core Collections & Schemas

### 1. `User`
```javascript
{
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, default: '' },
  role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER' },
  preferredSafetyMode: { type: String, enum: ['FAST', 'BALANCED', 'SAFE'], default: 'BALANCED' },
  emergencySettings: {
    sosPin: String,
    autoShareLocationOnSos: Boolean,
    fallbackEmergencyNumber: String
  },
  timestamps: true
}
```

### 2. `Crime` (2dsphere Indexed)
```javascript
{
  crimeId: { type: String, unique: true },
  crimeType: { type: String, required: true },
  category: {
    type: String,
    enum: ['THEFT', 'ROBBERY', 'ASSAULT', 'BURGLARY', 'SEXUAL_ASSAULT', 'VEHICLE_THEFT', 'VANDALISM', 'FRAUD', 'MURDER', 'OTHER'],
    required: true
  },
  severity: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' },
  latitude: { type: Number, required: true },
  longitude: { type: Number, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: [Number] // [longitude, latitude]
  },
  description: String,
  date: { type: Date, default: Date.now },
  time: String,
  source: String,
  sourceUrl: String,
  sourceType: { type: String, enum: ['OFFICIAL', 'NEWS', 'USER_REPORTED', 'OTHER'] },
  verified: Boolean,
  verificationStatus: { type: String, enum: ['VERIFIED', 'UNVERIFIED', 'PENDING'], default: 'VERIFIED' },
  isDemo: { type: Boolean, default: false },
  timestamps: true
}
// Indexes:
// - location: '2dsphere'
// - date: -1
// - category: 1, severity: 1
// - isDemo: 1, verificationStatus: 1
```

### 3. `Route`
```javascript
{
  routeId: { type: String, unique: true },
  userId: { type: ObjectId, ref: 'User' },
  name: String,
  sourceName: String,
  sourceCoords: { lat: Number, lng: Number },
  destName: String,
  destCoords: { lat: Number, lng: Number },
  distanceMeters: Number,
  durationSeconds: Number,
  geometry: Mixed,
  overallRisk: Number,
  riskLevel: String,
  safetyScore: Number,
  confidence: Number,
  reasons: [{ code: String, text: String, value: Mixed }],
  labels: [String],
  isSaved: Boolean,
  timestamps: true
}
```

### 4. `SOS`
```javascript
{
  sosId: { type: String, unique: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  userName: String,
  userPhone: String,
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  status: { type: String, enum: ['TRIGGERED', 'RESOLVED', 'CANCELLED'], default: 'TRIGGERED' },
  emergencyContactsNotified: [{ name: String, phone: String, notifiedAt: Date }],
  emergencyNumberDialed: { type: String, default: '112' },
  notes: String,
  resolvedAt: Date,
  timestamps: true
}
```

### 5. `CrimeReport`
```javascript
{
  reportId: { type: String, unique: true },
  userId: { type: ObjectId, ref: 'User', required: true },
  crimeType: String,
  category: String,
  severity: String,
  latitude: Number,
  longitude: Number,
  location: { type: { type: String, default: 'Point' }, coordinates: [Number] },
  description: String,
  incidentDate: Date,
  status: { type: String, enum: ['PENDING', 'VERIFIED', 'REJECTED'], default: 'PENDING' },
  adminNotes: String,
  isDemo: Boolean,
  timestamps: true
}
```

### 6. `TrustedContact` & `Trip` & `Alert`
- `TrustedContact`: User emergency contacts with strict owner isolation.
- `Trip`: Active journey telemetry, deviation counter, and safety check-in countdown.
- `Alert`: Time-expiring safety announcements with automatic TTL indexes.

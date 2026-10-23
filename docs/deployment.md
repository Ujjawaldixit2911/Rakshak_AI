# RAKSHAK AI — DEPLOYMENT GUIDE

## System Requirements
- Node.js >= 18.0.0
- Python >= 3.10
- MongoDB >= 6.0 (with 2dsphere spatial support)
- Docker & Docker Compose (for containerized deployment)

## Environment Configuration

### Backend (`backend/.env`)
```bash
PORT=5000
NODE_ENV=production
MONGO_URI=mongodb://127.0.0.1:27017/rakshak_ai
JWT_SECRET=your-production-secret-key-min-32-chars
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:3000
OSRM_URL=https://router.project-osrm.org
NOMINATIM_URL=https://nominatim.openstreetmap.org
ML_SERVICE_URL=http://127.0.0.1:8000
EMERGENCY_NUMBER=112
```

### ML Microservice (`ml/requirements.txt`)
```bash
fastapi>=0.110.0
uvicorn>=0.28.0
pydantic>=2.6.0
scikit-learn>=1.4.0
scipy>=1.12.0
pandas>=2.2.0
numpy>=1.26.0
joblib>=1.3.0
shapely>=2.0.0
pytest>=8.0.0
```

### Frontend (`frontend/.env.local`)
```bash
NEXT_PUBLIC_API_URL=http://localhost:5000/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:5000
```

## Running Locally

### 1. Start MongoDB
Ensure MongoDB is running locally on port `27017`.

### 2. Start ML Microservice
```bash
cd ml
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

### 3. Seed Demo Data & Start Backend
```bash
cd backend
npm install
node ../scripts/seed.js
npm start
```

### 4. Start Frontend Client
```bash
cd frontend
npm install
npm run dev
```

### 5. Execute End-to-End Validation
```bash
node scripts/e2e-smoke.js
```

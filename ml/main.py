"""
Rakshak AI - FastAPI ML & Analytics Microservice
Provides ML Risk Estimation, DBSCAN Clustering, and Health Monitoring.
"""
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from inference.risk_predictor import predict_corridor_risk, load_model
from inference.dbscan_hotspots import identify_hotspots

app = FastAPI(
    title="Rakshak AI ML Microservice",
    description="Explainable Geospatial Safety Risk Estimator & DBSCAN Hotspot Detection",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class PredictRequest(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="Latitude coordinate")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="Longitude coordinate")
    crimeDensity: float = Field(default=0.0, ge=0.0, description="Crimes per kilometer")
    historicalCrimeCount: int = Field(default=0, ge=0, description="Total historical crimes along corridor")
    hour: Optional[int] = Field(default=12, ge=0, le=23, description="Hour of day (0-23)")
    dayOfWeek: Optional[int] = Field(default=2, ge=0, le=6, description="Day of week (0=Mon, 6=Sun)")

class CrimeItem(BaseModel):
    id: Optional[str] = None
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    severity: Optional[str] = "MEDIUM"
    category: Optional[str] = "THEFT"

class HotspotsRequest(BaseModel):
    crimes: List[CrimeItem] = Field(..., description="List of crime incidents for spatial clustering")
    eps_km: Optional[float] = Field(default=0.75, gt=0.0, description="DBSCAN neighborhood radius in km")
    min_samples: Optional[int] = Field(default=4, ge=2, description="Minimum incidents to form a cluster")

@app.get("/health", status_code=status.HTTP_200_OK)
def health_check():
    model, metadata = load_model()
    return {
        "status": "ONLINE",
        "modelLoaded": model is not None,
        "modelVersion": metadata.get("modelVersion", "1.0.0") if metadata else "1.0.0",
        "isDemo": True
    }

@app.get("/model-info", status_code=status.HTTP_200_OK)
def model_info():
    model, metadata = load_model()
    if not metadata:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model metadata is not available"
        )
    return metadata

@app.post("/predict-risk", status_code=status.HTTP_200_OK)
def predict_risk_endpoint(payload: PredictRequest):
    result = predict_corridor_risk(payload.model_dump())
    if not result.get("success"):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=result.get("error", "Prediction failed")
        )
    return {
        "riskScore": result["riskScore"],
        "riskLevel": result["riskLevel"],
        "modelVersion": result["modelVersion"],
        "isDemo": result["isDemo"]
    }

@app.post("/hotspots", status_code=status.HTTP_200_OK)
def hotspots_endpoint(payload: HotspotsRequest):
    crimes_data = [c.model_dump() for c in payload.crimes]
    hotspots = identify_hotspots(
        crimes=crimes_data,
        eps_km=payload.eps_km,
        min_samples=payload.min_samples
    )
    return {
        "totalHotspots": len(hotspots),
        "hotspots": hotspots
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000)

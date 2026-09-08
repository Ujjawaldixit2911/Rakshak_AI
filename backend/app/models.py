"""
models.py
SQLAlchemy models for Crime Alert Map (Rakshak AI)
Includes crime_records, ride_context, environment_context, users, incident_reports, safety_scores, and sos_alerts.
"""
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, JSON, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="citizen")  # citizen, verified_reporter, police, admin
    phone = Column(String(30), nullable=True)
    emergency_contacts = Column(JSON, default=list)  # List of contact strings/objects
    home_location = Column(JSON, nullable=True)
    work_location = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    incident_reports = relationship("IncidentReport", back_populates="reporter")
    sos_alerts = relationship("SOSAlert", back_populates="user", foreign_keys="SOSAlert.user_id")


class CrimeRecord(Base):
    __tablename__ = "crime_records"

    id = Column(Integer, primary_key=True, index=True)  # Crime_ID
    city = Column(String(50), index=True, nullable=False)  # Delhi, Mumbai
    location_name = Column(String(150), index=True)
    date_time = Column(DateTime(timezone=True), index=True)
    crime_type = Column(String(100), index=True, nullable=False)  # Harassment, Burglary, Robbery, etc.
    lat = Column(Float, nullable=False, index=True)
    lon = Column(Float, nullable=False, index=True)
    severity = Column(Integer, default=5)  # 1–10
    response_time_min = Column(Float, nullable=True)
    resolved = Column(Boolean, default=False)
    arrested = Column(Boolean, default=False)
    cctv_count = Column(Integer, default=0)
    police_station_count = Column(Integer, default=0)
    time_of_day = Column(String(30), index=True)  # Morning, Afternoon, Evening, Night
    victim_gender = Column(String(30), index=True)  # Female, Male, Other
    source = Column(String(50), default="Official")  # Official, Community, NCRB

    ride_contexts = relationship("RideContext", back_populates="crime_record")
    env_contexts = relationship("EnvironmentContext", back_populates="crime_record")


class RideContext(Base):
    __tablename__ = "ride_context"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    crime_id = Column(Integer, ForeignKey("crime_records.id", ondelete="SET NULL"), nullable=True, index=True)
    ride_id = Column(String(50), index=True)
    ride_date_time = Column(DateTime(timezone=True))
    pickup_location = Column(String(150))
    drop_location = Column(String(150))
    duration_min = Column(Float)
    distance_km = Column(Float)
    fare_inr = Column(Float)
    surge_factor = Column(Float, default=1.0)
    driver_rating = Column(Float, default=4.5)
    cancellation_status = Column(String(50))  # Completed, Cancelled_by_User, etc.
    uber_ola_overlap = Column(Float, default=0.5)
    public_complaints = Column(String(255), nullable=True)

    crime_record = relationship("CrimeRecord", back_populates="ride_contexts")


class EnvironmentContext(Base):
    __tablename__ = "environment_context"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    crime_id = Column(Integer, ForeignKey("crime_records.id", ondelete="SET NULL"), nullable=True, index=True)
    city = Column(String(50), index=True)
    recorded_at = Column(DateTime(timezone=True))
    temperature_c = Column(Float)
    rainfall_mm = Column(Float, default=0.0)
    visibility_km = Column(Float, default=10.0)
    humidity_pct = Column(Float)
    wind_speed_kmh = Column(Float)
    weather_condition = Column(String(50))  # Clear, Rainy, Foggy, Hazy, etc.
    congestion_level = Column(String(30))  # Low, Medium, High, Severe
    avg_speed_kmh = Column(Float)
    accidents_reported = Column(Integer, default=0)

    crime_record = relationship("CrimeRecord", back_populates="env_contexts")


class IncidentReport(Base):
    __tablename__ = "incident_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    reporter_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    city = Column(String(50), index=True, default="Delhi")
    location_name = Column(String(150), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    crime_type = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    severity = Column(Integer, default=5)
    status = Column(String(30), default="pending")  # pending, verified, rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    reporter = relationship("User", back_populates="incident_reports")


class SafetyScore(Base):
    __tablename__ = "safety_scores"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    grid_cell_id = Column(String(100), index=True)
    city = Column(String(50), index=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(String(30))  # Safe, Moderate, High Risk
    last_calculated = Column(DateTime(timezone=True), server_default=func.now())


class SOSAlert(Base):
    __tablename__ = "sos_alerts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    city = Column(String(50), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(String(50), default="Active")  # Active, Officer Dispatched, Resolved
    contacts_notified = Column(JSON, default=list)
    officer_assigned = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="sos_alerts", foreign_keys=[user_id])
    officer = relationship("User", foreign_keys=[officer_assigned])

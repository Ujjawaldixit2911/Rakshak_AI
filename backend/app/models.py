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


class Journey(Base):
    __tablename__ = "journeys"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    journey_uuid = Column(String(64), unique=True, index=True, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    start_lat = Column(Float, nullable=False)
    start_lon = Column(Float, nullable=False)
    start_name = Column(String(200), default="Start Location")
    dest_lat = Column(Float, nullable=False)
    dest_lon = Column(Float, nullable=False)
    dest_name = Column(String(200), default="Destination")
    route_type = Column(String(50), default="Safe")  # Safe, Fast, Balanced
    selected_route = Column(JSON, nullable=True)  # { polyline, waypoints, distance_km, eta_min, risk_score }
    start_time = Column(DateTime(timezone=True), nullable=True)
    expected_arrival = Column(DateTime(timezone=True), nullable=True)
    current_lat = Column(Float, nullable=True)
    current_lon = Column(Float, nullable=True)
    current_risk = Column(Float, default=15.0)
    risk_level = Column(String(30), default="Low")
    status = Column(String(50), default="PLANNED", index=True)  # PLANNED, STARTED, IN_PROGRESS, ARRIVED, CANCELLED
    deviations_count = Column(Integer, default=0)
    deviation_alerts = Column(JSON, default=list)
    safety_briefing = Column(JSON, nullable=True)
    summary = Column(JSON, nullable=True)  # { duration_min, distance_km, avg_risk, route_adhered_pct }
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())


class PoliceCaseLog(Base):
    __tablename__ = "police_case_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    report_id = Column(Integer, ForeignKey("incident_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    changed_by = Column(String(100), default="System")
    role = Column(String(50), default="POLICE_OFFICER")
    old_status = Column(String(50), nullable=True)
    new_status = Column(String(50), nullable=False)
    action_note = Column(Text, nullable=True)
    evidence_urls = Column(JSON, default=list)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class PlatformAuditLog(Base):
    __tablename__ = "platform_audit_logs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(Integer, nullable=True, index=True)
    user_role = Column(String(50), default="PUBLIC_USER")
    action = Column(String(100), nullable=False, index=True)  # e.g. SOS_TRIGGERED, DATASET_REIMPORT, CONFIG_UPDATE
    permission_tier = Column(Integer, default=1)  # 1 (Read), 2 (Form Actions), 3 (Sensitive Actions)
    ip_address = Column(String(50), nullable=True)
    details = Column(JSON, default=dict)
    status = Column(String(20), default="SUCCESS")
    timestamp = Column(DateTime(timezone=True), server_default=func.now())


class AdminSystemConfig(Base):
    __tablename__ = "admin_system_configs"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    config_key = Column(String(100), unique=True, nullable=False, index=True)
    config_val = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_by = Column(String(100), default="Admin")
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class EmergencyPOI(Base):
    __tablename__ = "emergency_pois"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(200), nullable=False, index=True)
    type = Column(String(50), nullable=False, index=True)  # police, hospital, fire_station, pharmacy
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    source = Column(String(100), default="Overpass API (OSM)")
    phone = Column(String(50), nullable=True)
    city = Column(String(50), index=True, default="Delhi")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class SOSEvent(Base):
    __tablename__ = "sos_events"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    status = Column(String(50), default="ACTIVE", index=True)  # ACTIVE, RESOLVED, CANCELLED
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)
    metadata_info = Column(JSON, default=dict)


class TrustedContact(Base):
    __tablename__ = "trusted_contacts"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    relationship = Column(String(50), nullable=True)  # Parent, Sibling, Spouse, Friend, Guardian
    phone = Column(String(30), nullable=False)
    email = Column(String(150), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), nullable=False, index=True)
    crime_type = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    description = Column(Text, nullable=True)
    photo_url = Column(String(500), nullable=True)
    status = Column(String(50), default="Reported", index=True)  # Reported, Under Review, Verified, Rejected
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class UserSafetyProfile(Base):
    __tablename__ = "user_safety_profiles"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), unique=True, nullable=False, index=True)
    role = Column(String(50), default="citizen") # citizen, corporate, emergency, police
    travel_preference = Column(String(50), default="safest")  # fastest, safest, balanced
    night_travel_enabled = Column(Boolean, default=True)
    women_safety_mode = Column(Boolean, default=False)
    avoid_high_crime_areas = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class JourneyHistory(Base):
    __tablename__ = "journey_history"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    user_id = Column(String(100), index=True, nullable=False)
    source = Column(String(200), nullable=False)
    destination = Column(String(200), nullable=False)
    source_lat = Column(Float, nullable=True)
    source_lon = Column(Float, nullable=True)
    dest_lat = Column(Float, nullable=True)
    dest_lon = Column(Float, nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now(), index=True)
    safety_score = Column(Float, default=88.0)
    route_type = Column(String(50), default="Safest")  # Safest, Balanced, Fastest
    distance_km = Column(Float, nullable=True)
    duration_min = Column(Float, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())







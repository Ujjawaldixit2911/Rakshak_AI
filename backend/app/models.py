from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    phone = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(String, default="Citizen") # Citizen, Police, Admin
    emergency_contacts = Column(JSON) # List of strings
    home_location = Column(JSON) # GeoJSON Point
    work_location = Column(JSON) # GeoJSON Point
    language_pref = Column(String, default="en")

class CrimeIncident(Base):
    __tablename__ = "crime_incidents"
    id = Column(Integer, primary_key=True, index=True)
    lat = Column(Float)
    lng = Column(Float)
    crime_type = Column(String, index=True)
    severity = Column(Integer) # 1-10
    source = Column(String) # Official, Community
    reported_at = Column(DateTime(timezone=True), server_default=func.now())
    verification_status = Column(String, default="Unverified")
    description = Column(String)

class Route(Base):
    __tablename__ = "routes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    origin = Column(String)
    destination = Column(String)
    route_type = Column(String) # Recommended, Balanced, Fastest
    geometry = Column(JSON) # GeoJSON LineString
    risk_score = Column(Float)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RouteSegment(Base):
    __tablename__ = "route_segments"
    id = Column(Integer, primary_key=True, index=True)
    route_id = Column(Integer, ForeignKey("routes.id"))
    segment_geometry = Column(JSON) # GeoJSON LineString
    segment_risk_score = Column(Float)
    dominant_crime_types = Column(JSON) # List of strings

class SOSAlert(Base):
    __tablename__ = "sos_alerts"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    lat = Column(Float)
    lng = Column(Float)
    status = Column(String, default="Alert Received") # Alert Received, Officer Assigned, Responding, Arrived, Handled
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    officer_assigned = Column(Integer, ForeignKey("users.id"), nullable=True)
    resolved_at = Column(DateTime(timezone=True), nullable=True)

class DataSource(Base):
    __tablename__ = "data_sources"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String)
    period_start = Column(DateTime(timezone=True))
    period_end = Column(DateTime(timezone=True))
    last_updated = Column(DateTime(timezone=True))
    coverage_notes = Column(String)

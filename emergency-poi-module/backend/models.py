"""
models.py
PostGIS / SQLAlchemy Database Models for Emergency POI Module.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import declarative_base

Base = declarative_base()

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

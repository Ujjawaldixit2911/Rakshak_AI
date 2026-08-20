import asyncio
import random
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal, engine, Base
from .models import CrimeIncident, DataSource

DELHI_BOUNDS = {
    "lat_min": 28.40,
    "lat_max": 28.88,
    "lng_min": 76.84,
    "lng_max": 77.34
}

CRIME_TYPES = ["Theft", "Assault", "Robbery", "Harassment", "Vandalism"]
SOURCES = ["Official", "Community"]

async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check if data already exists
        # Add Data Source
        data_source = DataSource(
            name="Delhi NCR Synthetic Crime Data",
            period_start=datetime.datetime.now() - datetime.timedelta(days=365),
            period_end=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            coverage_notes="Synthetic dataset generated for MVP demonstration purposes."
        )
        session.add(data_source)
        
        print("Generating 1000 synthetic crime incidents for Delhi NCR...")
        for _ in range(1000):
            lat = random.uniform(DELHI_BOUNDS["lat_min"], DELHI_BOUNDS["lat_max"])
            lng = random.uniform(DELHI_BOUNDS["lng_min"], DELHI_BOUNDS["lng_max"])
            crime_type = random.choice(CRIME_TYPES)
            severity = random.randint(1, 10)
            source = random.choice(SOURCES)
            days_ago = random.randint(0, 365)
            reported_at = datetime.datetime.now() - datetime.timedelta(days=days_ago)
            
            incident = CrimeIncident(
                lat=lat,
                lng=lng,
                crime_type=crime_type,
                severity=severity,
                source=source,
                reported_at=reported_at,
                verification_status="Verified" if source == "Official" else "Unverified",
                description=f"A reported {crime_type.lower()} incident."
            )
            session.add(incident)
        
        await session.commit()
        print("Database seeded successfully!")

if __name__ == "__main__":
    asyncio.run(seed_data())

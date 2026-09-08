"""
seed.py — Seed 2000 realistic Lucknow crime incidents across 15 named areas.
Run: python -m app.seed
"""
import asyncio
import random
import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from .database import AsyncSessionLocal, engine, Base
from .models import CrimeIncident, DataSource

# ── Lucknow area definitions ──────────────────────────────────────────────────
AREAS = {
    "Gomti Nagar":   {"lat": 26.8469, "lng": 81.0093, "radius": 0.020, "base_rate": 0.85},
    "Hazratganj":    {"lat": 26.8505, "lng": 80.9491, "radius": 0.015, "base_rate": 1.10},
    "Sector 62":     {"lat": 26.8600, "lng": 80.9760, "radius": 0.018, "base_rate": 0.65},
    "Alambagh":      {"lat": 26.8094, "lng": 80.9115, "radius": 0.020, "base_rate": 0.80},
    "Charbagh":      {"lat": 26.8375, "lng": 80.9177, "radius": 0.012, "base_rate": 1.00},
    "Indira Nagar":  {"lat": 26.8731, "lng": 81.0004, "radius": 0.022, "base_rate": 0.70},
    "Aliganj":       {"lat": 26.8818, "lng": 80.9662, "radius": 0.018, "base_rate": 0.55},
    "Mahanagar":     {"lat": 26.8710, "lng": 80.9552, "radius": 0.015, "base_rate": 0.60},
    "Vikas Nagar":   {"lat": 26.8200, "lng": 80.9750, "radius": 0.018, "base_rate": 0.50},
    "Chinhat":       {"lat": 26.8600, "lng": 81.0500, "radius": 0.020, "base_rate": 0.45},
    "Rajajipuram":   {"lat": 26.8300, "lng": 80.9100, "radius": 0.018, "base_rate": 0.72},
    "Hussainganj":   {"lat": 26.8527, "lng": 80.9392, "radius": 0.012, "base_rate": 0.88},
    "Aminabad":      {"lat": 26.8423, "lng": 80.9296, "radius": 0.014, "base_rate": 0.95},
    "Telibagh":      {"lat": 26.7908, "lng": 80.9503, "radius": 0.020, "base_rate": 0.48},
    "Jankipuram":    {"lat": 26.9000, "lng": 80.9700, "radius": 0.022, "base_rate": 0.55},
}

CRIME_TYPES = [
    "Snatching", "Robbery", "Pickpocketing", "Theft",
    "Assault", "Vandalism", "Other",
]

# Crime type weights per area type
HIGH_DENSITY_CRIMES = ["Snatching", "Pickpocketing", "Robbery", "Theft"]
RESIDENTIAL_CRIMES  = ["Theft", "Vandalism", "Other", "Assault"]

SEVERITY_MAP = {
    "Snatching":     (5, 9),
    "Robbery":       (6, 10),
    "Pickpocketing": (2, 5),
    "Theft":         (3, 6),
    "Assault":       (5, 9),
    "Vandalism":     (1, 4),
    "Other":         (2, 6),
}

# Peak hour probability weights (hour 0-23)
HOUR_WEIGHTS = [
    0.3, 0.2, 0.1, 0.1, 0.1, 0.2,   # 0-5 AM
    0.5, 0.8, 1.0, 0.9, 0.8, 0.9,   # 6-11 AM
    1.0, 0.9, 0.8, 0.9, 1.0, 1.1,   # 12-17 PM
    1.5, 2.0, 1.8, 1.6, 1.2, 0.7,   # 18-23 PM
]
_total_hw = sum(HOUR_WEIGHTS)
HOUR_PROBS = [w / _total_hw for w in HOUR_WEIGHTS]


def _random_hour() -> int:
    return random.choices(range(24), weights=HOUR_PROBS, k=1)[0]


def _random_coords(area_meta: dict) -> tuple[float, float]:
    """Random point within a rough circle around area centroid."""
    r = area_meta["radius"]
    lat = area_meta["lat"] + random.uniform(-r, r)
    lng = area_meta["lng"] + random.uniform(-r, r)
    return round(lat, 6), round(lng, 6)


async def seed_data():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Skip if already seeded
        from sqlalchemy import func as sqlfunc, select
        count_q = await session.execute(select(sqlfunc.count()).select_from(CrimeIncident))
        count = count_q.scalar()
        if count and count > 100:
            print(f"Database already has {count} incidents — skipping seed.")
            return

        data_source = DataSource(
            name="Lucknow Synthetic Crime Data 2024-25",
            period_start=datetime.datetime.now() - datetime.timedelta(days=365),
            period_end=datetime.datetime.now(),
            last_updated=datetime.datetime.now(),
            coverage_notes="Synthetic dataset for 15 Lucknow areas — MVP demonstration.",
        )
        session.add(data_source)

        print("Generating 2000 synthetic crime incidents for Lucknow...")
        total_incidents = 2000
        area_names = list(AREAS.keys())
        rates = [AREAS[a]["base_rate"] for a in area_names]
        total_rate = sum(rates)
        area_counts = {a: max(10, int(total_incidents * AREAS[a]["base_rate"] / total_rate))
                       for a in area_names}

        for area_name, count in area_counts.items():
            meta = AREAS[area_name]
            is_high_density = meta["base_rate"] > 0.75

            for _ in range(count):
                lat, lng = _random_coords(meta)
                crime_type = random.choice(HIGH_DENSITY_CRIMES if is_high_density else CRIME_TYPES)
                sev_min, sev_max = SEVERITY_MAP[crime_type]
                severity = random.randint(sev_min, sev_max)
                source = random.choices(["Official", "Community"], weights=[0.6, 0.4])[0]

                days_ago = random.randint(0, 365)
                hour = _random_hour()
                minute = random.randint(0, 59)
                reported_at = (
                    datetime.datetime.now()
                    - datetime.timedelta(days=days_ago)
                ).replace(hour=hour, minute=minute, second=0, microsecond=0)

                incident = CrimeIncident(
                    lat=lat,
                    lng=lng,
                    area=area_name,
                    crime_type=crime_type,
                    severity=severity,
                    source=source,
                    reported_at=reported_at,
                    verification_status="Verified" if source == "Official" else "Pending",
                    description=f"{crime_type} reported in {area_name}.",
                )
                session.add(incident)

        await session.commit()
        print("Done! Database seeded with 2000 Lucknow crime incidents.")


if __name__ == "__main__":
    asyncio.run(seed_data())

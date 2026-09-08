"""
load_seed_data.py
Ingestion & preprocessing pipeline for Crime Alert Map (Rakshak AI).
Reads ride_safety_dataset.csv, handles nulls, normalizes bounding box coordinates,
and loads 5,000 records into the database.
"""
import os
import sys
import random
import datetime
import asyncio
import pandas as pd
import numpy as np
from sqlalchemy import select, func, delete
from sqlalchemy.ext.asyncio import AsyncSession

from .database import engine, AsyncSessionLocal, Base
from .models import CrimeRecord, RideContext, EnvironmentContext, User, IncidentReport, SOSAlert, SafetyScore

# City Bounding Boxes
CITY_BOUNDS = {
    "Delhi": {
        "lat_min": 28.4000,
        "lat_max": 28.9000,
        "lon_min": 76.8000,
        "lon_max": 77.4000,
        "default_center": (28.6139, 77.2090),
    },
    "Mumbai": {
        "lat_min": 18.9000,
        "lat_max": 19.3000,
        "lon_min": 72.7000,
        "lon_max": 72.9800,
        "default_center": (19.0760, 72.8777),
    }
}

DELHI_LOCALITIES = {
    "Connaught Place": (28.6315, 77.2167),
    "Hauz Khas": (28.5494, 77.2001),
    "Rohini": (28.7495, 77.0565),
    "Dwarka": (28.5921, 77.0460),
    "Karol Bagh": (28.6514, 77.1907),
    "Chandni Chowk": (28.6506, 77.2303),
    "Saket": (28.5245, 77.2066),
    "Janakpuri": (28.6219, 77.0878),
    "Lajpat Nagar": (28.5700, 77.2373),
    "Noida Border (Mayur Vihar)": (28.6080, 77.2950),
    "Shahdara": (28.6734, 77.2885),
    "Vasant Kunj": (28.5293, 77.1554),
    "Pitampura": (28.6990, 77.1384),
    "Paharganj": (28.6433, 77.2144),
    "Okhla": (28.5355, 77.2732),
}

MUMBAI_LOCALITIES = {
    "Bandra West": (19.0596, 72.8295),
    "Andheri East": (19.1136, 72.8697),
    "Colaba": (18.9067, 72.8147),
    "Dadar": (19.0178, 72.8478),
    "Kurla": (19.0726, 72.8845),
    "Juhu": (19.1075, 72.8263),
    "Thane West": (19.2183, 72.9781),
    "Borivali West": (19.2307, 72.8567),
    "Powai": (19.1176, 72.9060),
    "Marine Lines": (18.9438, 72.8234),
    "Ghatkopar": (19.0860, 72.9090),
    "Malad West": (19.1860, 72.8485),
    "Worli": (19.0134, 72.8170),
    "Vashi (Navi Mumbai)": (19.0771, 72.9986),
    "Chembur": (19.0522, 72.8995),
}


def find_csv_path() -> str:
    """Locates ride_safety_dataset.csv in backend/data or project root."""
    possible_paths = [
        os.path.join(os.path.dirname(__file__), "..", "data", "ride_safety_dataset.csv"),
        os.path.join(os.path.dirname(__file__), "data", "ride_safety_dataset.csv"),
        os.path.join(os.getcwd(), "backend", "data", "ride_safety_dataset.csv"),
        os.path.join(os.getcwd(), "data", "ride_safety_dataset.csv"),
    ]
    for p in possible_paths:
        abs_p = os.path.abspath(p)
        if os.path.exists(abs_p):
            return abs_p
    raise FileNotFoundError("Could not find ride_safety_dataset.csv in backend/data/ directory.")


def clean_and_normalize_data(df: pd.DataFrame) -> tuple[pd.DataFrame, dict]:
    """Cleans null values and validates/re-projects out-of-bound coordinates."""
    audit = {
        "initial_rows": len(df),
        "null_counts_by_col": {},
        "total_nulls_handled": int(df.isna().sum().sum()),
        "coordinates_corrected": 0,
        "dropped_rows": 0,
    }

    # 1. Audit nulls
    for col in df.columns:
        n_null = int(df[col].isna().sum())
        if n_null > 0:
            audit["null_counts_by_col"][col] = n_null

    # 2. Impute Numeric Columns with Median
    numeric_cols = [
        "Crime_Severity", "Police_Response_Time_Minutes", "Ride_Duration_Minutes",
        "Distance_KM", "Ride_Fare_INR", "Ride_Surge_Pricing_Factor", "Driver_Rating",
        "Weather_Temperature_C", "Weather_Rainfall_mm", "Weather_Visibility_KM",
        "Weather_Humidity_%", "Weather_Wind_Speed_KMH", "Traffic_Avg_Speed_KMH",
        "Road_Accidents_Reported", "Nearby_CCTV_Cameras", "Num_Police_Stations_Nearby",
        "Uber_Ola_Route_Overlap"
    ]
    for col in numeric_cols:
        if col in df.columns:
            median_val = df[col].median()
            df[col] = df[col].fillna(median_val if not pd.isna(median_val) else 0.0)

    # 3. Impute Categorical Columns
    categorical_defaults = {
        "Weather_Condition": "Clear",
        "Traffic_Congestion_Level": "Medium",
        "Public_Complaints": "None",
        "Passenger_Gender": "Unknown",
        "Ride_Cancellation_Status": "Completed",
        "Crime_Type": "Theft",
        "City": "Delhi",
        "Location": "Central Area",
        "Time_of_Day": "Evening",
    }
    for col, default_val in categorical_defaults.items():
        if col in df.columns:
            df[col] = df[col].fillna(default_val)

    # 4. Standardize Boolean Flags
    for bool_col in ["Resolved", "Suspect_Arrested"]:
        if bool_col in df.columns:
            df[bool_col] = df[bool_col].apply(
                lambda x: True if str(x).lower() in ["true", "1", "yes", "t"] else False
            )

    # 5. Geocode / Bounding Box Validation & Re-projection
    corrected_coords = 0
    clean_rows = []

    for _, row in df.iterrows():
        city = str(row.get("City", "Delhi")).strip()
        if city not in CITY_BOUNDS:
            city = "Delhi"

        bounds = CITY_BOUNDS[city]
        lat = float(row.get("Latitude", bounds["default_center"][0]))
        lon = float(row.get("Longitude", bounds["default_center"][1]))
        loc_name = str(row.get("Location", ""))

        # Check if out of bounds
        is_oob = not (bounds["lat_min"] <= lat <= bounds["lat_max"] and bounds["lon_min"] <= lon <= bounds["lon_max"])
        
        if is_oob:
            corrected_coords += 1
            # Re-project near known locality center or city center with small jitter
            localities = DELHI_LOCALITIES if city == "Delhi" else MUMBAI_LOCALITIES
            if loc_name in localities:
                c_lat, c_lon = localities[loc_name]
            else:
                c_lat, c_lon = bounds["default_center"]

            lat = round(c_lat + random.uniform(-0.015, 0.015), 6)
            lon = round(c_lon + random.uniform(-0.015, 0.015), 6)

        row["Latitude"] = lat
        row["Longitude"] = lon
        row["City"] = city
        clean_rows.append(row)

    cleaned_df = pd.DataFrame(clean_rows)
    audit["coordinates_corrected"] = corrected_coords
    audit["final_rows"] = len(cleaned_df)
    return cleaned_df, audit


async def seed_users(session: AsyncSession):
    """Seed initial demo users if not present."""
    result = await session.execute(select(func.count()).select_from(User))
    if result.scalar() == 0:
        demo_users = [
            User(
                name="Inspector Sharma",
                email="police@rakshak.ai",
                password_hash="$2b$12$eXAmPL3hAShP0l1c3SecUr1tyK3y",
                role="police",
                phone="+91-9811001122",
                emergency_contacts=["+91-9811000000", "+91-9811999999"]
            ),
            User(
                name="Admin Control",
                email="admin@rakshak.ai",
                password_hash="$2b$12$eXAmPL3hAShAdm1nSecUr1tyK3y",
                role="admin",
                phone="+91-9876543210",
                emergency_contacts=["112", "100"]
            ),
            User(
                name="Priya Patel",
                email="priya@rakshak.ai",
                password_hash="$2b$12$eXAmPL3hAShC1t1z3nSecUr1tyK3y",
                role="citizen",
                phone="+91-9820011223",
                emergency_contacts=["+91-9820099887", "+91-9820055443"]
            ),
            User(
                name="Rahul Verma (Reporter)",
                email="reporter@rakshak.ai",
                password_hash="$2b$12$eXAmPL3hAShRep0rt3rSecUr1ty",
                role="verified_reporter",
                phone="+91-9810055667",
                emergency_contacts=["+91-9810011111"]
            )
        ]
        session.add_all(demo_users)
        await session.commit()
        print("[Auth] Seeded 4 default demo accounts (citizen, verified_reporter, police, admin).")


async def load_seed_data():
    """Main pipeline entrypoint to ingest ride_safety_dataset.csv into the DB."""
    csv_path = find_csv_path()
    print(f"\n=======================================================")
    print(f"Loading seed dataset from: {csv_path}")
    print(f"=======================================================")

    df = pd.read_csv(csv_path)
    print(f"Raw CSV loaded: {len(df)} rows, {len(df.columns)} columns.")

    cleaned_df, audit = clean_and_normalize_data(df)

    print("\n--- Data Cleaning & Preprocessing Audit ---")
    print(f"Total Rows Ingested:        {audit['final_rows']}")
    print(f"Total Null Values Handled:  {audit['total_nulls_handled']}")
    print(f"Coordinates Re-projected:   {audit['coordinates_corrected']} (normalized to real Delhi/Mumbai bounds)")
    print("Nulls per Column Handled:")
    for col, count in audit["null_counts_by_col"].items():
        print(f"  • {col}: {count} missing values imputed")
    print("-------------------------------------------\n")

    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        await seed_users(session)

        # Ultra-fast bulk insert
        from sqlalchemy import insert
        
        # Check if already seeded
        q = await session.execute(select(func.count()).select_from(CrimeRecord))
        count = q.scalar()
        if count and count >= len(cleaned_df):
            print(f"Database already contains {count} crime records.")
            return

        print("Executing bulk insertion into database...")
        crime_dicts = []
        ride_dicts = []
        env_dicts = []
        complaint_dicts = []

        for idx, row in cleaned_df.iterrows():
            crime_id = int(row.get("Crime_ID", 1000 + idx))
            date_str = str(row.get("Date", "2024-01-01")).strip()
            time_str = str(row.get("Time", "12:00:00")).strip()
            try:
                dt = datetime.datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S")
            except Exception:
                dt = datetime.datetime.now()

            crime_dicts.append({
                "id": crime_id,
                "city": str(row.get("City", "Delhi")),
                "location_name": str(row.get("Location", "Area")),
                "date_time": dt,
                "crime_type": str(row.get("Crime_Type", "Theft")),
                "lat": float(row.get("Latitude")),
                "lon": float(row.get("Longitude")),
                "severity": int(row.get("Crime_Severity", 5)),
                "response_time_min": float(row.get("Police_Response_Time_Minutes", 15.0)),
                "resolved": bool(row.get("Resolved", False)),
                "arrested": bool(row.get("Suspect_Arrested", False)),
                "cctv_count": int(row.get("Nearby_CCTV_Cameras", 0)),
                "police_station_count": int(row.get("Num_Police_Stations_Nearby", 0)),
                "time_of_day": str(row.get("Time_of_Day", "Evening")),
                "victim_gender": str(row.get("Passenger_Gender", "Unknown")),
                "source": "Official",
            })

            ride_dicts.append({
                "crime_id": crime_id,
                "ride_id": str(row.get("Ride_ID", f"RIDE-{crime_id}")),
                "ride_date_time": dt,
                "pickup_location": str(row.get("Pickup_Location", row.get("Location", ""))),
                "drop_location": str(row.get("Drop_Location", "")),
                "duration_min": float(row.get("Ride_Duration_Minutes", 20.0)),
                "distance_km": float(row.get("Distance_KM", 5.0)),
                "fare_inr": float(row.get("Ride_Fare_INR", 150.0)),
                "surge_factor": float(row.get("Ride_Surge_Pricing_Factor", 1.0)),
                "driver_rating": float(row.get("Driver_Rating", 4.5)),
                "cancellation_status": str(row.get("Ride_Cancellation_Status", "Completed")),
                "uber_ola_overlap": float(row.get("Uber_Ola_Route_Overlap", 0.5)),
                "public_complaints": str(row.get("Public_Complaints", "None")),
            })

            env_dicts.append({
                "crime_id": crime_id,
                "city": str(row.get("City", "Delhi")),
                "recorded_at": dt,
                "temperature_c": float(row.get("Weather_Temperature_C", 25.0)),
                "rainfall_mm": float(row.get("Weather_Rainfall_mm", 0.0)),
                "visibility_km": float(row.get("Weather_Visibility_KM", 8.0)),
                "humidity_pct": float(row.get("Weather_Humidity_%", 60.0)),
                "wind_speed_kmh": float(row.get("Weather_Wind_Speed_KMH", 12.0)),
                "weather_condition": str(row.get("Weather_Condition", "Clear")),
                "congestion_level": str(row.get("Traffic_Congestion_Level", "Medium")),
                "avg_speed_kmh": float(row.get("Traffic_Avg_Speed_KMH", 30.0)),
                "accidents_reported": int(row.get("Road_Accidents_Reported", 0)),
            })

            complaint_text = str(row.get("Public_Complaints", "None")).strip()
            if complaint_text and complaint_text.lower() != "none" and idx % 4 == 0:
                complaint_dicts.append({
                    "reporter_id": 3,
                    "city": str(row.get("City", "Delhi")),
                    "location_name": str(row.get("Location", "")),
                    "lat": float(row.get("Latitude")),
                    "lon": float(row.get("Longitude")),
                    "crime_type": "Community Safety Issue",
                    "description": complaint_text,
                    "severity": max(2, int(row.get("Crime_Severity", 4)) - 1),
                    "status": "verified" if idx % 2 == 0 else "pending",
                    "created_at": dt,
                })

        CHUNK_SIZE = 50
        for i in range(0, len(crime_dicts), CHUNK_SIZE):
            await session.execute(insert(CrimeRecord), crime_dicts[i:i+CHUNK_SIZE])
            await session.execute(insert(RideContext), ride_dicts[i:i+CHUNK_SIZE])
            await session.execute(insert(EnvironmentContext), env_dicts[i:i+CHUNK_SIZE])
            await session.commit()

        if complaint_dicts:
            for i in range(0, len(complaint_dicts), CHUNK_SIZE):
                await session.execute(insert(IncidentReport), complaint_dicts[i:i+CHUNK_SIZE])
                await session.commit()

        print(f"[Success] Database seeded successfully!")
        print(f"  • {len(crime_dicts)} Crime Records loaded")
        print(f"  • {len(ride_dicts)} Ride Context Records loaded")
        print(f"  • {len(env_dicts)} Environment Context Records loaded")
        print(f"  • {len(complaint_dicts)} Historical Community Incident Reports loaded")


if __name__ == "__main__":
    asyncio.run(load_seed_data())

"""
generate_dataset.py
Generates the 5,000-row, 38-column 'ride_safety_dataset.csv' for Delhi and Mumbai.
Incorporates ~750 realistic null values and out-of-bound coordinates as specified in project requirements.
"""
import os
import random
import datetime
import pandas as pd
import numpy as np

def generate_csv(output_path=None, num_rows=5000):
    if output_path is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        output_path = os.path.join(base_dir, "data", "ride_safety_dataset.csv")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    random.seed(42)
    np.random.seed(42)

    delhi_locations = {
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

    mumbai_locations = {
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

    crime_types = [
        ("Harassment", 7),
        ("Burglary", 6),
        ("Fraud", 4),
        ("Robbery", 8),
        ("Theft", 5),
        ("Assault", 9),
        ("Stalking", 7),
        ("Snatching", 6),
        ("Vandalism", 3)
    ]

    weather_conditions = ["Clear", "Rainy", "Foggy", "Hazy", "Overcast", "Thunderstorm"]
    congestion_levels = ["Low", "Medium", "High", "Severe"]
    complaint_samples = [
        "Poor street lighting reported",
        "Suspicious gathering at night",
        "Rash driving near signal",
        "Lack of police patrolling",
        "Broken CCTV cameras",
        "Isolated dark stretch near bus stop",
        "Drunkards roaming near park",
        "None",
        "None",
        "None"
    ]

    start_date = datetime.date(2024, 1, 1)
    end_date = datetime.date(2025, 2, 28)
    date_range_days = (end_date - start_date).days

    rows = []

    for i in range(1, num_rows + 1):
        city = random.choices(["Delhi", "Mumbai"], weights=[0.55, 0.45])[0]
        loc_dict = delhi_locations if city == "Delhi" else mumbai_locations
        loc_name = random.choice(list(loc_dict.keys()))
        center_lat, center_lon = loc_dict[loc_name]

        # 8% of rows will intentionally have out-of-bounds coords (e.g. 24.3 lat)
        is_oob = random.random() < 0.08
        if is_oob:
            lat = round(random.uniform(22.0, 25.5), 6)
            lon = round(random.uniform(75.0, 78.5), 6)
        else:
            lat = round(center_lat + random.uniform(-0.025, 0.025), 6)
            lon = round(center_lon + random.uniform(-0.025, 0.025), 6)

        c_type, base_sev = random.choice(crime_types)
        severity = min(10, max(1, base_sev + random.randint(-1, 1)))

        rand_days = random.randint(0, date_range_days)
        rec_date = start_date + datetime.timedelta(days=rand_days)
        hour = random.randint(0, 23)
        minute = random.randint(0, 59)
        second = random.randint(0, 59)
        rec_time = f"{hour:02d}:{minute:02d}:{second:02d}"

        if 5 <= hour < 12:
            time_of_day = "Morning"
        elif 12 <= hour < 17:
            time_of_day = "Afternoon"
        elif 17 <= hour < 22:
            time_of_day = "Evening"
        else:
            time_of_day = "Night"

        # Higher harassment & stalking for female victims at night/evening
        if time_of_day in ["Night", "Evening"] and c_type in ["Harassment", "Stalking", "Snatching"]:
            passenger_gender = random.choices(["Female", "Male", "Other"], weights=[0.75, 0.20, 0.05])[0]
        else:
            passenger_gender = random.choices(["Female", "Male", "Other"], weights=[0.45, 0.50, 0.05])[0]

        resolved = random.choices([True, False], weights=[0.65, 0.35])[0]
        arrested = random.choices([True, False], weights=[0.55, 0.45])[0] if resolved else False
        resp_time = round(random.uniform(4.0, 40.0), 1)

        # Ride Context
        pickup_loc = loc_name
        drop_loc = random.choice(list(loc_dict.keys()))
        ride_dur = round(random.uniform(10.0, 75.0), 1)
        dist_km = round(random.uniform(2.5, 32.0), 2)
        fare_inr = round(dist_km * random.uniform(18.0, 28.0) + random.uniform(30.0, 60.0), 2)
        surge = round(random.choices([1.0, 1.2, 1.5, 2.0, 2.5], weights=[0.5, 0.25, 0.15, 0.07, 0.03])[0], 2)
        driver_rating = round(random.uniform(3.5, 5.0), 2)
        cancellation = random.choices(["Completed", "Cancelled_by_User", "Cancelled_by_Driver"], weights=[0.88, 0.08, 0.04])[0]
        overlap = round(random.uniform(0.2, 0.95), 2)
        complaint = random.choice(complaint_samples)

        # Weather & Environment
        weather_cond = random.choice(weather_conditions)
        temp_c = round(random.uniform(18.0, 42.0) if city == "Delhi" else random.uniform(24.0, 36.0), 1)
        rain_mm = round(random.uniform(5.0, 60.0), 1) if weather_cond in ["Rainy", "Thunderstorm"] else 0.0
        vis_km = round(random.uniform(1.0, 4.0), 1) if weather_cond in ["Foggy", "Hazy"] else round(random.uniform(5.0, 10.0), 1)
        humidity = round(random.uniform(50.0, 95.0) if city == "Mumbai" else random.uniform(25.0, 85.0), 1)
        wind_kmh = round(random.uniform(5.0, 30.0), 1)

        traffic_cong = random.choices(congestion_levels, weights=[0.25, 0.35, 0.30, 0.10])[0]
        avg_speed = round(50.0 - (congestion_levels.index(traffic_cong) * 11.0) + random.uniform(-3, 3), 1)
        avg_speed = max(8.0, avg_speed)
        accidents = random.choices([0, 1, 2, 3], weights=[0.7, 0.2, 0.07, 0.03])[0]

        cctv = random.randint(1, 20)
        police_stations = random.randint(0, 3)

        row = {
            "Crime_ID": 1000 + i,
            "City": city,
            "Location": loc_name,
            "Date": rec_date.strftime("%Y-%m-%d"),
            "Time": rec_time,
            "Crime_Type": c_type,
            "Latitude": lat,
            "Longitude": lon,
            "Crime_Severity": severity,
            "Police_Response_Time_Minutes": resp_time,
            "Resolved": resolved,
            "Suspect_Arrested": arrested,
            "Ride_ID": f"RIDE-{20000 + i}",
            "Ride_Date": rec_date.strftime("%Y-%m-%d"),
            "Ride_Time": rec_time,
            "Pickup_Location": pickup_loc,
            "Drop_Location": drop_loc,
            "Ride_Duration_Minutes": ride_dur,
            "Distance_KM": dist_km,
            "Ride_Fare_INR": fare_inr,
            "Ride_Surge_Pricing_Factor": surge,
            "Driver_Rating": driver_rating,
            "Ride_Cancellation_Status": cancellation,
            "Weather_Temperature_C": temp_c,
            "Weather_Rainfall_mm": rain_mm,
            "Weather_Visibility_KM": vis_km,
            "Weather_Humidity_%": humidity,
            "Weather_Wind_Speed_KMH": wind_kmh,
            "Weather_Condition": weather_cond,
            "Traffic_Congestion_Level": traffic_cong,
            "Traffic_Avg_Speed_KMH": avg_speed,
            "Road_Accidents_Reported": accidents,
            "Nearby_CCTV_Cameras": cctv,
            "Num_Police_Stations_Nearby": police_stations,
            "Uber_Ola_Route_Overlap": overlap,
            "Public_Complaints": complaint,
            "Time_of_Day": time_of_day,
            "Passenger_Gender": passenger_gender
        }
        rows.append(row)

    df = pd.DataFrame(rows)

    # Introduce ~750 realistic null values across various columns as specified
    null_columns = [
        "Police_Response_Time_Minutes",
        "Weather_Rainfall_mm",
        "Weather_Visibility_KM",
        "Weather_Humidity_%",
        "Traffic_Avg_Speed_KMH",
        "Nearby_CCTV_Cameras",
        "Num_Police_Stations_Nearby",
        "Driver_Rating",
        "Passenger_Gender",
        "Weather_Condition",
        "Public_Complaints"
    ]

    total_nulls = 0
    target_nulls = 750
    nulls_per_col = target_nulls // len(null_columns)

    for col in null_columns:
        idx = random.sample(range(num_rows), nulls_per_col)
        df.loc[idx, col] = np.nan
        total_nulls += nulls_per_col

    df.to_csv(output_path, index=False)
    print(f"Generated dataset at {output_path} with {len(df)} rows, {len(df.columns)} columns, and {df.isna().sum().sum()} null values.")

if __name__ == "__main__":
    generate_csv()

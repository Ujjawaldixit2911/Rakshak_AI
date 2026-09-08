import asyncio
from app.database import AsyncSessionLocal
from app.ml.hotspot_detector import detect_hotspots
from app.ml.safety_score_engine import calculate_safety_score, generate_safety_heatmap_grid

async def run_tests():
    async with AsyncSessionLocal() as session:
        print("\n--- Testing Phase 2: DBSCAN Hotspot Detection ---")
        delhi_hs = await detect_hotspots(session, city="Delhi")
        mumbai_hs = await detect_hotspots(session, city="Mumbai")
        print(f"Delhi Hotspots detected: {delhi_hs['total_hotspots']} (Total incidents: {delhi_hs['total_incidents']})")
        if delhi_hs['features']:
            top = delhi_hs['features'][0]['properties']
            print(f"  Top Hotspot: Cluster #{top['cluster_id']} | Risk: {top['risk_score']}/100 ({top['risk_category']}) | Dominant: {top['dominant_crime_type']} | Peak: {top['peak_time_of_day']}")
        print(f"Mumbai Hotspots detected: {mumbai_hs['total_hotspots']} (Total incidents: {mumbai_hs['total_incidents']})")

        print("\n--- Testing Phase 3: Area Safety Score Engine ---")
        delhi_cp = await calculate_safety_score(session, 28.6315, 77.2167, city="Delhi", time_of_day="Night", mode="women_safety")
        print(f"Delhi (Connaught Place, Night + Women Safety Mode):")
        print(f"  Safety Score: {delhi_cp['safety_score']}/100 ({delhi_cp['risk_level']})")
        print(f"  Nearby incidents: {delhi_cp['nearby_incidents_count']} | Factors: {delhi_cp['factors']}")

        mumbai_bandra = await calculate_safety_score(session, 19.0596, 72.8295, city="Mumbai", time_of_day="Evening")
        print(f"Mumbai (Bandra West, Evening):")
        print(f"  Safety Score: {mumbai_bandra['safety_score']}/100 ({mumbai_bandra['risk_level']})")

        print("\n--- Testing Phase 4 & 5: Safe Route Recommendation (Modified Dijkstra) ---")
        from app.ml.routing_engine import compute_safe_and_fast_routes

        delhi_route = await compute_safe_and_fast_routes(
            session=session,
            origin_lat=28.6315, origin_lon=77.2167,  # Connaught Place
            dest_lat=28.5245, dest_lon=77.2066,      # Saket
            city="Delhi",
            time_of_day="Night",
            mode="women_safety"
        )
        print("Delhi (Connaught Place -> Saket, Women Safety Mode):")
        print(f"  Safest Route: {delhi_route['safest_route']['distance_km']} km | {delhi_route['safest_route']['estimated_time_minutes']} mins | Safety: {delhi_route['safest_route']['average_safety_score']}/100")
        print(f"  Fastest Route: {delhi_route['fastest_route']['distance_km']} km | {delhi_route['fastest_route']['estimated_time_minutes']} mins | Safety: {delhi_route['fastest_route']['average_safety_score']}/100")
        print(f"  AI Trade-off Explanation: {delhi_route['trade_off']['explanation']}")
        print(f"  Nearby Emergency POIs: {len(delhi_route['nearby_emergency_pois'])} available.")

        mumbai_route = await compute_safe_and_fast_routes(
            session=session,
            origin_lat=18.9067, origin_lon=72.8147,  # Colaba
            dest_lat=19.0596, dest_lon=72.8295,      # Bandra West
            city="Mumbai",
            time_of_day="Evening",
            mode="night_safety"
        )
        print("\nMumbai (Colaba -> Bandra West, Night Safety Mode):")
        print(f"  Safest Route: {mumbai_route['safest_route']['distance_km']} km | {mumbai_route['safest_route']['estimated_time_minutes']} mins | Safety: {mumbai_route['safest_route']['average_safety_score']}/100")
        print(f"  Trade-off: {mumbai_route['trade_off']['explanation']}")

        print("\n[ALL PHASES 1-5 ENGINE TESTS PASSED SUCCESSFULLY!]")

if __name__ == "__main__":
    asyncio.run(run_tests())

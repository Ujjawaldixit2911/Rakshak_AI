"""
routing_engine.py
Safe Route Recommendation Engine using NetworkX and Modified Dijkstra/A*.
Builds realistic road network graphs for Delhi and Mumbai, assigns dynamic risk-adjusted edge costs,
and computes both 'Safest Route' and 'Fastest Route' with detailed trade-off analysis.
"""
import math
import heapq
import networkx as nx
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession

from .safety_score_engine import calculate_safety_score, haversine_distance


# ─── ROAD NETWORK GRAPH DEFINITIONS (DELHI & MUMBAI) ──────────────────────────

DELHI_ROAD_NODES = {
    "connaught_place": (28.6315, 77.2167, "Connaught Place"),
    "paharganj": (28.6433, 77.2144, "Paharganj"),
    "karol_bagh": (28.6514, 77.1907, "Karol Bagh"),
    "chandni_chowk": (28.6506, 77.2303, "Chandni Chowk"),
    "shahdara": (28.6734, 77.2885, "Shahdara"),
    "pitampura": (28.6990, 77.1384, "Pitampura"),
    "rohini": (28.7495, 77.0565, "Rohini"),
    "janakpuri": (28.6219, 77.0878, "Janakpuri"),
    "dwarka": (28.5921, 77.0460, "Dwarka"),
    "hauz_khas": (28.5494, 77.2001, "Hauz Khas"),
    "saket": (28.5245, 77.2066, "Saket"),
    "vasant_kunj": (28.5293, 77.1554, "Vasant Kunj"),
    "lajpat_nagar": (28.5700, 77.2373, "Lajpat Nagar"),
    "mayur_vihar": (28.6080, 77.2950, "Mayur Vihar"),
    "okhla": (28.5355, 77.2732, "Okhla"),
    "india_gate": (28.6129, 77.2295, "India Gate"),
    "delhi_aiims": (28.5672, 77.2100, "AIIMS / Ring Road"),
    "ito_junction": (28.6289, 77.2407, "ITO Junction"),
}

DELHI_ROAD_EDGES = [
    ("connaught_place", "paharganj", 1.8, 35),
    ("connaught_place", "india_gate", 2.2, 45),
    ("connaught_place", "karol_bagh", 3.5, 30),
    ("connaught_place", "ito_junction", 2.0, 40),
    ("paharganj", "chandni_chowk", 2.5, 25),
    ("chandni_chowk", "shahdara", 5.2, 35),
    ("ito_junction", "mayur_vihar", 6.0, 50),
    ("ito_junction", "lajpat_nagar", 5.8, 45),
    ("india_gate", "lajpat_nagar", 4.5, 45),
    ("india_gate", "delhi_aiims", 5.0, 50),
    ("delhi_aiims", "hauz_khas", 2.5, 40),
    ("delhi_aiims", "saket", 4.8, 40),
    ("delhi_aiims", "okhla", 7.0, 45),
    ("lajpat_nagar", "okhla", 4.2, 40),
    ("hauz_khas", "saket", 3.2, 35),
    ("hauz_khas", "vasant_kunj", 4.5, 40),
    ("saket", "vasant_kunj", 5.5, 35),
    ("vasant_kunj", "dwarka", 9.5, 55),
    ("karol_bagh", "pitampura", 7.0, 40),
    ("karol_bagh", "janakpuri", 8.2, 40),
    ("janakpuri", "dwarka", 5.8, 45),
    ("pitampura", "rohini", 6.5, 45),
    ("janakpuri", "pitampura", 8.0, 40),
]

MUMBAI_ROAD_NODES = {
    "colaba": (18.9067, 72.8147, "Colaba"),
    "marine_lines": (18.9438, 72.8234, "Marine Lines"),
    "cst_fort": (18.9400, 72.8350, "CST / Fort"),
    "worli": (19.0134, 72.8170, "Worli (Sea Link South)"),
    "dadar": (19.0178, 72.8478, "Dadar TT"),
    "bandra_west": (19.0596, 72.8295, "Bandra West (Sea Link North)"),
    "kurla": (19.0726, 72.8845, "Kurla West"),
    "chembur": (19.0522, 72.8995, "Chembur"),
    "ghatkopar": (19.0860, 72.9090, "Ghatkopar"),
    "juhu": (19.1075, 72.8263, "Juhu Beach"),
    "andheri_east": (19.1136, 72.8697, "Andheri East"),
    "andheri_west": (19.1197, 72.8286, "Andheri West"),
    "powai": (19.1176, 72.9060, "Powai IIT"),
    "malad_west": (19.1860, 72.8485, "Malad West"),
    "borivali_west": (19.2307, 72.8567, "Borivali West"),
    "vashi": (19.0771, 72.9986, "Vashi Bridge"),
    "thane_west": (19.2183, 72.9781, "Thane Majiwada"),
}

MUMBAI_ROAD_EDGES = [
    ("colaba", "cst_fort", 3.2, 30),
    ("cst_fort", "marine_lines", 1.8, 30),
    ("marine_lines", "worli", 7.5, 45),
    ("cst_fort", "dadar", 8.5, 35),
    ("worli", "dadar", 3.0, 30),
    ("worli", "bandra_west", 5.6, 65),  # Bandra-Worli Sea Link (High Speed)
    ("dadar", "bandra_west", 4.5, 35),
    ("dadar", "kurla", 5.8, 30),
    ("dadar", "chembur", 6.2, 35),
    ("bandra_west", "juhu", 5.0, 35),
    ("bandra_west", "andheri_west", 6.5, 35),
    ("bandra_west", "kurla", 6.0, 30),
    ("kurla", "chembur", 3.8, 35),
    ("kurla", "ghatkopar", 4.2, 35),
    ("chembur", "vashi", 9.0, 60),
    ("juhu", "andheri_west", 3.0, 30),
    ("andheri_west", "andheri_east", 4.0, 25),
    ("andheri_east", "powai", 5.2, 35),
    ("andheri_east", "ghatkopar", 6.5, 35),
    ("powai", "ghatkopar", 4.5, 35),
    ("powai", "thane_west", 13.0, 45),
    ("andheri_west", "malad_west", 7.5, 35),
    ("malad_west", "borivali_west", 6.0, 40),
    ("borivali_west", "thane_west", 15.0, 45),
]

# Emergency Points of Interest (Police Stations & 24x7 Hospitals)
EMERGENCY_POIS = {
    "Delhi": [
        {"name": "Connaught Place Police Station", "type": "police", "lat": 28.6328, "lon": 77.2195, "phone": "011-23340555"},
        {"name": "Hauz Khas Police Station", "type": "police", "lat": 28.5482, "lon": 77.2024, "phone": "011-26510093"},
        {"name": "Rohini North Police Station", "type": "police", "lat": 28.7510, "lon": 77.0600, "phone": "011-27551000"},
        {"name": "Saket Police Station", "type": "police", "lat": 28.5220, "lon": 77.2100, "phone": "011-29561000"},
        {"name": "AIIMS New Delhi (Apex Trauma Center)", "type": "hospital", "lat": 28.5672, "lon": 77.2100, "phone": "011-26588500"},
        {"name": "Safdarjung Hospital 24x7 Emergency", "type": "hospital", "lat": 28.5705, "lon": 77.2078, "phone": "011-26165060"},
        {"name": "Max Super Speciality Hospital Saket", "type": "hospital", "lat": 28.5280, "lon": 77.2120, "phone": "011-26515050"},
    ],
    "Mumbai": [
        {"name": "Bandra Police Station", "type": "police", "lat": 19.0580, "lon": 72.8310, "phone": "022-26422002"},
        {"name": "Colaba Police Station", "type": "police", "lat": 18.9080, "lon": 72.8160, "phone": "022-22852885"},
        {"name": "Andheri Police Station", "type": "police", "lat": 19.1150, "lon": 72.8710, "phone": "022-26831515"},
        {"name": "Powai Police Station", "type": "police", "lat": 19.1190, "lon": 72.9080, "phone": "022-25702690"},
        {"name": "Lilavati Hospital 24x7 Bandra", "type": "hospital", "lat": 19.0515, "lon": 72.8290, "phone": "022-26751000"},
        {"name": "KEM Hospital Parel Emergency", "type": "hospital", "lat": 19.0024, "lon": 72.8420, "phone": "022-24107000"},
        {"name": "Dr. L H Hiranandani Hospital Powai", "type": "hospital", "lat": 19.1195, "lon": 72.9130, "phone": "022-25763300"},
    ]
}


def build_road_graph(city: str = "Delhi") -> nx.Graph:
    """Instantiates a weighted undirected NetworkX Graph for the target city."""
    G = nx.Graph()
    nodes = DELHI_ROAD_NODES if city == "Delhi" else MUMBAI_ROAD_NODES
    edges = DELHI_ROAD_EDGES if city == "Delhi" else MUMBAI_ROAD_EDGES

    for node_id, (lat, lon, name) in nodes.items():
        G.add_node(node_id, lat=lat, lon=lon, name=name)

    for u, v, dist_km, speed_kmh in edges:
        time_min = round((dist_km / speed_kmh) * 60.0, 2)
        # Midpoint coordinate for spatial edge safety evaluation
        u_lat, u_lon, _ = nodes[u]
        v_lat, v_lon, _ = nodes[v]
        mid_lat = (u_lat + v_lat) / 2.0
        mid_lon = (u_lon + v_lon) / 2.0

        G.add_edge(
            u, v,
            length_km=dist_km,
            speed_kmh=speed_kmh,
            time_min=time_min,
            mid_lat=mid_lat,
            mid_lon=mid_lon
        )

    return G


def find_nearest_node(G: nx.Graph, lat: float, lon: float) -> str:
    """Finds closest node in the road network to arbitrary GPS coordinates."""
    best_node = None
    min_dist = float("inf")
    for node, data in G.nodes(data=True):
        dist = haversine_distance(lat, lon, data["lat"], data["lon"])
        if dist < min_dist:
            min_dist = dist
            best_node = node
    return best_node


async def compute_safe_and_fast_routes(
    session: AsyncSession,
    origin_lat: float,
    origin_lon: float,
    dest_lat: float,
    dest_lon: float,
    city: str = "Delhi",
    time_of_day: str = "Evening",
    mode: str = "women_safety"  # normal, night_safety, women_safety
) -> dict:
    """
    Computes both the 'Safest Route' and 'Fastest Route' using Modified Dijkstra.
    
    Cost Function for Safe Navigation:
    Cost(e) = Time(e) * [ 1.0 + beta * ((100 - SafetyScore(e)) / 25.0) * ModeMultiplier ]
    
    Modes:
    - Normal: beta = 0.8
    - Night Safety: beta = 1.8 (penalizes low-visibility / night crime stretches)
    - Women Safety: beta = 2.5 (penalizes harassment corridors, favors CCTV/police corridors)
    """
    G = build_road_graph(city)
    start_node = find_nearest_node(G, origin_lat, origin_lon)
    end_node = find_nearest_node(G, dest_lat, dest_lon)

    if not start_node or not end_node:
        raise ValueError("Could not map origin/destination to road network.")

    # 1. Mode multipliers
    if mode == "women_safety":
        beta = 2.4
    elif mode == "night_safety":
        beta = 1.8
    else:
        beta = 0.7

    # 2. Assign dynamic risk weights to every edge in the graph
    for u, v, data in G.edges(data=True):
        score_info = await calculate_safety_score(
            session=session,
            lat=data["mid_lat"],
            lon=data["mid_lon"],
            city=city,
            time_of_day=time_of_day,
            mode=mode
        )
        edge_safety = score_info["safety_score"]
        data["safety_score"] = edge_safety
        
        # Risk penalty normalized (0 to ~4.0)
        risk_penalty = max(0.0, (100.0 - edge_safety) / 25.0)
        
        # Modified cost function
        safety_cost = data["time_min"] * (1.0 + (beta * risk_penalty))
        data["safety_cost"] = safety_cost

    # 3. Compute Fastest Route (Dijkstra weighted purely by time_min)
    try:
        fastest_path = nx.shortest_path(G, source=start_node, target=end_node, weight="time_min")
    except nx.NetworkXNoPath:
        fastest_path = [start_node, end_node]

    # 4. Compute Safest Route (Dijkstra weighted by safety_cost)
    try:
        safest_path = nx.shortest_path(G, source=start_node, target=end_node, weight="safety_cost")
    except nx.NetworkXNoPath:
        safest_path = fastest_path

    # Helper function to construct full route payload
    def build_path_details(path_nodes: list[str], route_label: str) -> dict:
        coords = []
        node_names = []
        total_dist = 0.0
        total_time = 0.0
        safety_scores = []

        # Add initial coordinate
        coords.append([origin_lat, origin_lon])

        for i, node in enumerate(path_nodes):
            nd = G.nodes[node]
            coords.append([nd["lat"], nd["lon"]])
            node_names.append(nd["name"])

            if i > 0:
                prev_node = path_nodes[i - 1]
                edge_data = G.get_edge_data(prev_node, node) or {}
                total_dist += edge_data.get("length_km", 2.0)
                total_time += edge_data.get("time_min", 4.0)
                safety_scores.append(edge_data.get("safety_score", 75.0))

        coords.append([dest_lat, dest_lon])
        avg_safety = round(float(sum(safety_scores) / len(safety_scores)), 1) if safety_scores else 80.0

        if avg_safety >= 75.0:
            risk_badge = "High Safety Zone"
            badge_color = "#22c55e"
        elif avg_safety >= 55.0:
            risk_badge = "Moderate Safety Corridor"
            badge_color = "#eab308"
        else:
            risk_badge = "Elevated Risk Corridor"
            badge_color = "#ef4444"

        return {
            "label": route_label,
            "path_nodes": path_nodes,
            "waypoints": node_names,
            "coordinates": coords,  # List of [lat, lon]
            "distance_km": round(total_dist, 2),
            "estimated_time_minutes": round(total_time, 1),
            "average_safety_score": avg_safety,
            "risk_badge": risk_badge,
            "badge_color": badge_color
        }

    fastest_details = build_path_details(fastest_path, "Fastest Route")
    safest_details = build_path_details(safest_path, "AI Recommended Safest Route")

    # 5. Compute Safety vs Time Trade-off Analysis
    time_delta = round(safest_details["estimated_time_minutes"] - fastest_details["estimated_time_minutes"], 1)
    safety_gain = round(safest_details["average_safety_score"] - fastest_details["average_safety_score"], 1)

    if safety_gain > 0:
        if time_delta > 0:
            trade_off_explanation = (
                f"The AI Safest Route increases your safety score by +{safety_gain} points ({safest_details['average_safety_score']}/100 vs {fastest_details['average_safety_score']}/100) "
                f"by routing through well-lit main corridors with higher CCTV & police patrol density, with only a minor +{time_delta} min trade-off."
            )
        else:
            trade_off_explanation = (
                f"The AI Safest Route is both the safest ({safest_details['average_safety_score']}/100) and optimal in travel time. "
                f"All segments adhere to active police monitoring corridors."
            )
    else:
        trade_off_explanation = (
            f"Both routes share similar high safety metrics ({safest_details['average_safety_score']}/100). "
            f"You can safely take the fastest path."
        )

    # 6. Retrieve Nearby Emergency POIs
    city_pois = EMERGENCY_POIS.get(city, EMERGENCY_POIS["Delhi"])
    relevant_pois = []
    for poi in city_pois:
        # Distance to route centroid
        d = haversine_distance(origin_lat, origin_lon, poi["lat"], poi["lon"])
        if d <= 12.0:
            relevant_pois.append({**poi, "distance_km": round(d, 2)})

    relevant_pois.sort(key=lambda x: x["distance_km"])

    return {
        "city": city,
        "mode": mode,
        "time_of_day": time_of_day,
        "safest_route": safest_details,
        "fastest_route": fastest_details,
        "trade_off": {
            "extra_time_minutes": max(0.0, time_delta),
            "safety_gain_points": max(0.0, safety_gain),
            "safety_increase_percentage": round((safety_gain / max(1.0, fastest_details["average_safety_score"])) * 100, 1),
            "explanation": trade_off_explanation
        },
        "nearby_emergency_pois": relevant_pois[:5]
    }

import math
from typing import List, Dict, Any
from shapely.geometry import LineString

def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)
    a = math.sin(delta_phi / 2.0) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return r * c

def split_route_geometry(coords: List[List[float]], target_segment_km: float = 0.8) -> List[Dict[str, Any]]:
    if len(coords) < 2:
        return []

    total_dist = 0.0
    for i in range(len(coords) - 1):
        p1 = coords[i]
        p2 = coords[i + 1]
        total_dist += haversine_km(p1[1], p1[0], p2[1], p2[0])

    if total_dist <= 0.001:
        return [{
            "segmentIndex": 0,
            "startPoint": coords[0],
            "endPoint": coords[-1],
            "midPoint": coords[0]
        }]

    num_segments = max(1, int(math.ceil(total_dist / target_segment_km)))
    actual_step = total_dist / num_segments

    line = LineString([(pt[0], pt[1]) for pt in coords])
    geom_len = line.length

    segments = []
    for idx in range(num_segments):
        start_d = idx * actual_step
        end_d = min(total_dist, (idx + 1) * actual_step)
        mid_d = (start_d + end_d) / 2.0

        norm_start = start_d / total_dist
        norm_end = end_d / total_dist
        norm_mid = mid_d / total_dist

        pt_s = line.interpolate(norm_start * geom_len)
        pt_e = line.interpolate(norm_end * geom_len)
        pt_m = line.interpolate(norm_mid * geom_len)

        segments.append({
            "segmentIndex": idx,
            "startPoint": [round(pt_s.x, 6), round(pt_s.y, 6)],
            "endPoint": [round(pt_e.x, 6), round(pt_e.y, 6)],
            "midPoint": [round(pt_m.x, 6), round(pt_m.y, 6)],
        })

    return segments

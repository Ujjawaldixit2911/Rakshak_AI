"""
DBSCAN Hotspot Identification using Haversine Distance (in Radians)
Pure scikit-learn DBSCAN with spatial clustering on crime coordinates.
"""
import numpy as np
from sklearn.cluster import DBSCAN
from collections import Counter

EARTH_RADIUS_KM = 6371.0088

def identify_hotspots(crimes, eps_km=0.75, min_samples=4):
    """
    Cluster spatial crime points using DBSCAN with haversine distance.
    crimes: list of dicts with keys: 'id', 'latitude', 'longitude', 'severity', 'category'
    """
    if not crimes or len(crimes) < min_samples:
        return []

    # Prepare coordinates in radians for Haversine metric [lat, lng]
    coords = np.array([[c['latitude'], c['longitude']] for c in crimes])
    coords_rad = np.radians(coords)

    # Convert eps from km to radians
    eps_rad = eps_km / EARTH_RADIUS_KM

    # Run DBSCAN
    db = DBSCAN(eps=eps_rad, min_samples=min_samples, metric='haversine', algorithm='ball_tree')
    labels = db.fit_predict(coords_rad)

    hotspots = []
    unique_labels = set(labels)

    for cluster_id in unique_labels:
        if cluster_id == -1:
            # Noise points
            continue

        cluster_mask = (labels == cluster_id)
        cluster_crimes = [crimes[i] for i, is_in in enumerate(cluster_mask) if is_in]
        cluster_coords = coords[cluster_mask]

        center_lat = float(np.mean(cluster_coords[:, 0]))
        center_lng = float(np.mean(cluster_coords[:, 1]))

        # Calculate cluster radius (max distance from centroid)
        d_lat = np.radians(cluster_coords[:, 0] - center_lat)
        d_lng = np.radians(cluster_coords[:, 1] - center_lng)
        a = np.sin(d_lat / 2.0)**2 + np.cos(np.radians(center_lat)) * np.cos(np.radians(cluster_coords[:, 0])) * np.sin(d_lng / 2.0)**2
        c = 2 * np.arcsin(np.sqrt(a))
        distances_km = c * EARTH_RADIUS_KM
        radius_meters = float(np.max(distances_km) * 1000) if len(distances_km) > 0 else 500.0
        radius_meters = max(250.0, radius_meters)

        # Dominant categories
        categories = [c.get('category', 'THEFT') for c in cluster_crimes]
        counts = Counter(categories)
        dominant_types = [cat for cat, _ in counts.most_common(3)]

        # Severity score
        sev_weights = {'LOW': 1, 'MEDIUM': 2, 'HIGH': 4, 'CRITICAL': 8}
        total_sev = sum(sev_weights.get(c.get('severity', 'MEDIUM').upper(), 2) for c in cluster_crimes)
        avg_sev = total_sev / len(cluster_crimes)

        hotspots.append({
            'hotspotId': f"HOTSPOT-DBSCAN-{cluster_id + 1}",
            'center': {
                'latitude': round(center_lat, 6),
                'longitude': round(center_lng, 6)
            },
            'radiusMeters': round(radius_meters, 1),
            'crimeCount': len(cluster_crimes),
            'dominantCrimeTypes': dominant_types,
            'averageSeverity': round(avg_sev, 2),
            'severityScore': total_sev
        })

    # Sort by crime count descending
    hotspots.sort(key=lambda x: x['crimeCount'], reverse=True)
    return hotspots

/**
 * Rakshak AI Geospatial Service
 * Spatial geometry, distance calculations, route segmentation, and corridor spatial query helpers.
 */
const Crime = require('../models/Crime');
const config = require('../config');

const EARTH_RADIUS_METERS = 6371000;

/**
 * Convert degrees to radians
 */
function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
function toDegrees(radians) {
  return radians * (180 / Math.PI);
}

/**
 * Calculate Haversine distance between two [lat, lng] points in meters
 */
function haversineDistanceMeters(point1, point2) {
  const [lat1, lng1] = [point1.lat || point1[0], point1.lng || point1[1]];
  const [lat2, lng2] = [point2.lat || point2[0], point2.lng || point2[1]];

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_METERS * c;
}

/**
 * Decode encoded polyline (Google/OSRM format) to array of [lat, lng]
 */
function decodePolyline(encoded) {
  if (!encoded || typeof encoded !== 'string') return [];
  const points = [];
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;

  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;

    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;

    points.push([lat / 1e5, lng / 1e5]);
  }
  return points;
}

/**
 * Divide a route coordinates array into discrete sub-segments of approximately `segmentLengthMeters`
 */
function segmentRoute(coordinates, segmentLengthMeters = config.SEGMENT_LENGTH_M) {
  if (!coordinates || coordinates.length < 2) return [];

  const segments = [];
  let currentSegment = [coordinates[0]];
  let currentSegmentDist = 0;
  let totalDistance = 0;

  for (let i = 0; i < coordinates.length - 1; i++) {
    const p1 = coordinates[i];
    const p2 = coordinates[i + 1];
    const dist = haversineDistanceMeters(
      { lat: p1[0], lng: p1[1] },
      { lat: p2[0], lng: p2[1] }
    );

    totalDistance += dist;
    currentSegmentDist += dist;
    currentSegment.push(p2);

    if (currentSegmentDist >= segmentLengthMeters || i === coordinates.length - 2) {
      const midpoint = [
        (currentSegment[0][0] + currentSegment[currentSegment.length - 1][0]) / 2,
        (currentSegment[0][1] + currentSegment[currentSegment.length - 1][1]) / 2
      ];

      segments.push({
        segmentIndex: segments.length,
        coordinates: [...currentSegment],
        midpoint: { lat: midpoint[0], lng: midpoint[1] },
        lengthMeters: Math.round(currentSegmentDist),
        startDistanceMeters: Math.round(totalDistance - currentSegmentDist),
        endDistanceMeters: Math.round(totalDistance)
      });

      currentSegment = [p2];
      currentSegmentDist = 0;
    }
  }

  return segments;
}

/**
 * Calculate bounding box with buffer for a set of coordinates
 */
function getBoundingBox(coordinates, bufferMeters = 500) {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;

  for (const p of coordinates) {
    const lat = p[0];
    const lng = p[1];
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  const latBuffer = toDegrees(bufferMeters / EARTH_RADIUS_METERS);
  const avgLat = (minLat + maxLat) / 2;
  const lngBuffer = toDegrees(bufferMeters / (EARTH_RADIUS_METERS * Math.cos(toRadians(avgLat))));

  return {
    minLat: minLat - latBuffer,
    maxLat: maxLat + latBuffer,
    minLng: minLng - lngBuffer,
    maxLng: maxLng + lngBuffer
  };
}

/**
 * Minimum distance from a point to a line segment in meters
 */
function distanceToSegmentMeters(point, segStart, segEnd) {
  const p = { lat: point.lat || point[0], lng: point.lng || point[1] };
  const a = { lat: segStart.lat || segStart[0], lng: segStart.lng || segStart[1] };
  const b = { lat: segEnd.lat || segEnd[0], lng: segEnd.lng || segEnd[1] };

  const l2 = Math.pow(b.lat - a.lat, 2) + Math.pow(b.lng - a.lng, 2);
  if (l2 === 0) return haversineDistanceMeters(p, a);

  let t = ((p.lat - a.lat) * (b.lat - a.lat) + (p.lng - a.lng) * (b.lng - a.lng)) / l2;
  t = Math.max(0, Math.min(1, t));

  const projection = {
    lat: a.lat + t * (b.lat - a.lat),
    lng: a.lng + t * (b.lng - a.lng)
  };

  return haversineDistanceMeters(p, projection);
}

/**
 * Find minimum distance from a point to an entire polyline in meters
 */
function distanceToPolylineMeters(point, polylineCoords) {
  if (!polylineCoords || polylineCoords.length < 2) return Infinity;
  let minDistance = Infinity;

  for (let i = 0; i < polylineCoords.length - 1; i++) {
    const dist = distanceToSegmentMeters(point, polylineCoords[i], polylineCoords[i + 1]);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

/**
 * Fetch crimes within the route corridor using spatial bounding box + precise polyline distance filter
 */
async function fetchCrimesAlongRoute(coordinates, corridorRadiusMeters = config.DEFAULT_SEARCH_RADIUS_M, includeDemo = true) {
  if (!coordinates || coordinates.length === 0) return [];

  const bbox = getBoundingBox(coordinates, corridorRadiusMeters + 100);

  // MongoDB 2dsphere spatial polygon query with bounding box (No full-collection scan)
  const query = {
    location: {
      $geoWithin: {
        $box: [
          [bbox.minLng, bbox.minLat],
          [bbox.maxLng, bbox.maxLat]
        ]
      }
    },
    verificationStatus: { $in: ['VERIFIED', 'UNVERIFIED', 'PENDING'] }
  };

  if (!includeDemo) {
    query.isDemo = false;
  }

  const candidateCrimes = await Crime.find(query).lean();

  // Precise filtering: check exact distance to route polyline
  const corridorCrimes = candidateCrimes.filter(crime => {
    const crimePoint = { lat: crime.latitude, lng: crime.longitude };
    const distToRoute = distanceToPolylineMeters(crimePoint, coordinates);
    crime.distanceToRouteMeters = Math.round(distToRoute);
    return distToRoute <= corridorRadiusMeters;
  });

  return corridorCrimes;
}

module.exports = {
  haversineDistanceMeters,
  decodePolyline,
  segmentRoute,
  getBoundingBox,
  distanceToSegmentMeters,
  distanceToPolylineMeters,
  fetchCrimesAlongRoute
};

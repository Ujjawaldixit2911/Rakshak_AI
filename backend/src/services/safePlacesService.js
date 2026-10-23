/**
 * Rakshak AI Safe Places Service
 * Locates verified nearby police stations, hospitals, and emergency posts.
 */
const axios = require('axios');
const { haversineDistanceMeters } = require('./geospatialService');

// Fallback emergency places directory for major demo hubs
const DEFAULT_EMERGENCY_HUBS = [
  { name: 'Central Police Headquarters', type: 'POLICE', lat: 28.6139, lng: 77.2090, phone: '112', address: 'Connaught Place, New Delhi' },
  { name: 'AIIMS Emergency Care', type: 'HOSPITAL', lat: 28.5672, lng: 77.2100, phone: '011-26588500', address: 'Ansari Nagar, New Delhi' },
  { name: 'Safdarjung Hospital Emergency Trauma', type: 'HOSPITAL', lat: 28.5701, lng: 77.2078, phone: '011-26165060', address: 'Ring Road, New Delhi' },
  { name: 'Parliament Street Police Station', type: 'POLICE', lat: 28.6256, lng: 77.2155, phone: '011-23361100', address: 'Parliament St, New Delhi' },
  { name: 'Cyber Crime Cell Unit', type: 'POLICE', lat: 28.6310, lng: 77.2190, phone: '1930', address: 'Barakhamba Road, New Delhi' },
  { name: 'City Women Police Help Desk', type: 'POLICE', lat: 28.6200, lng: 77.2120, phone: '1091', address: 'Janpath, New Delhi' }
];

/**
 * Fetch nearby emergency POIs given location [lat, lng] and radius in meters
 */
async function getNearbySafePlaces(lat, lng, radiusMeters = 5000, type = null) {
  const safePlaces = [];

  try {
    // Overpass API Query
    const overpassQuery = `
      [out:json][timeout:5];
      (
        node["amenity"="police"](around:${radiusMeters},${lat},${lng});
        node["amenity"="hospital"](around:${radiusMeters},${lat},${lng});
        node["amenity"="clinic"](around:${radiusMeters},${lat},${lng});
      );
      out body 10;
    `;

    const response = await axios.post('https://overpass-api.de/api/interpreter', overpassQuery, {
      headers: { 'Content-Type': 'text/plain' },
      timeout: 4000
    });

    if (response.data && response.data.elements && response.data.elements.length > 0) {
      for (const el of response.data.elements) {
        const placeLat = el.lat;
        const placeLng = el.lon;
        const dist = haversineDistanceMeters({ lat, lng }, { lat: placeLat, lng: placeLng });
        const amenityType = (el.tags.amenity || 'emergency').toUpperCase();

        safePlaces.push({
          id: `osm-${el.id}`,
          name: el.tags.name || `${amenityType === 'POLICE' ? 'Police Station' : 'Hospital / Medical Facility'}`,
          type: amenityType === 'POLICE' ? 'POLICE' : 'HOSPITAL',
          lat: placeLat,
          lng: placeLng,
          distanceMeters: Math.round(dist),
          distanceFormatted: dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`,
          phone: el.tags.phone || (amenityType === 'POLICE' ? '112' : '102'),
          address: el.tags['addr:street'] || el.tags['addr:city'] || 'Location mapped via OpenStreetMap',
          source: 'OpenStreetMap Overpass'
        });
      }
    }
  } catch (err) {
    // If Overpass is offline or times out, use calculated distance to fallback directory
    console.warn(`[SafePlaces Overpass Notice] ${err.message}. Using directory fallback.`);
  }

  // If no places from Overpass, synthesize based on relative proximity to default hubs
  if (safePlaces.length === 0) {
    for (const hub of DEFAULT_EMERGENCY_HUBS) {
      const dist = haversineDistanceMeters({ lat, lng }, { lat: hub.lat, lng: hub.lng });
      if (dist <= radiusMeters || dist <= 15000) {
        safePlaces.push({
          id: `hub-${hub.name.replace(/\s+/g, '-').toLowerCase()}`,
          name: hub.name,
          type: hub.type,
          lat: hub.lat,
          lng: hub.lng,
          distanceMeters: Math.round(dist),
          distanceFormatted: dist < 1000 ? `${Math.round(dist)} m` : `${(dist / 1000).toFixed(1)} km`,
          phone: hub.phone,
          address: hub.address,
          source: 'Emergency Directory'
        });
      }
    }
  }

  // Sort by nearest first
  safePlaces.sort((a, b) => a.distanceMeters - b.distanceMeters);

  if (type) {
    return safePlaces.filter(p => p.type === type.toUpperCase());
  }

  return safePlaces;
}

module.exports = {
  getNearbySafePlaces
};

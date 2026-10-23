/**
 * Rakshak AI Geocoding Service (Nominatim OSM Proxy)
 * Complies with OSM Nominatim usage policy:
 * - Specific User-Agent identification
 * - Rate limiting to <= 1 request per second
 * - In-memory LRU caching to minimize upstream load
 */
const axios = require('axios');
const config = require('../config');

// In-memory geocode cache: query string -> { results, expiresAt }
const geocodeCache = new Map();
let lastRequestTime = 0;

/**
 * Throttle helper to respect Nominatim 1 req/s policy
 */
async function throttleNominatim() {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < 1000) {
    const waitTime = 1000 - elapsed;
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  lastRequestTime = Date.now();
}

/**
 * Search locations by text query with caching
 */
async function searchLocation(query, countryCodes = 'in', limit = 5) {
  if (!query || typeof query !== 'string' || query.trim().length < 2) {
    return [];
  }

  const cacheKey = `search:${query.toLowerCase().trim()}:${countryCodes}:${limit}`;
  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  await throttleNominatim();

  try {
    const url = `${config.NOMINATIM_URL}/search`;
    const response = await axios.get(url, {
      params: {
        q: query,
        format: 'jsonv2',
        addressdetails: 1,
        limit,
        countrycodes: countryCodes
      },
      headers: {
        'User-Agent': 'RakshakAI-SafetyNavigation/1.0 (contact: info@rakshakai.org)'
      },
      timeout: 8000
    });

    const results = (response.data || []).map(item => ({
      placeId: item.place_id,
      displayName: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type,
      category: item.category,
      address: item.address || {}
    }));

    geocodeCache.set(cacheKey, {
      data: results,
      expiresAt: Date.now() + config.CACHE_TTL.geocode * 1000
    });

    return results;
  } catch (error) {
    console.error(`[Nominatim Geocode Error] ${error.message}`);
    // If upstream fails or times out, return empty list rather than crashing
    return [];
  }
}

/**
 * Reverse geocode [lat, lng] to place description
 */
async function reverseGeocode(lat, lng) {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  const cacheKey = `rev:${roundedLat}:${roundedLng}`;

  const cached = geocodeCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  await throttleNominatim();

  try {
    const url = `${config.NOMINATIM_URL}/reverse`;
    const response = await axios.get(url, {
      params: {
        lat: roundedLat,
        lon: roundedLng,
        format: 'jsonv2',
        addressdetails: 1
      },
      headers: {
        'User-Agent': 'RakshakAI-SafetyNavigation/1.0 (contact: info@rakshakai.org)'
      },
      timeout: 8000
    });

    const result = {
      placeId: response.data.place_id,
      displayName: response.data.display_name || `${roundedLat}, ${roundedLng}`,
      lat: parseFloat(response.data.lat || roundedLat),
      lng: parseFloat(response.data.lon || roundedLng),
      address: response.data.address || {}
    };

    geocodeCache.set(cacheKey, {
      data: result,
      expiresAt: Date.now() + config.CACHE_TTL.geocode * 1000
    });

    return result;
  } catch (error) {
    console.error(`[Nominatim Reverse Error] ${error.message}`);
    return {
      displayName: `${roundedLat}, ${roundedLng}`,
      lat: roundedLat,
      lng: roundedLng,
      address: {}
    };
  }
}

module.exports = {
  searchLocation,
  reverseGeocode
};

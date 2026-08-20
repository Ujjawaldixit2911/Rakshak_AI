export const getRoute = async (start: [number, number], destination: [number, number]) => {
  const url =
    `https://router.project-osrm.org/route/v1/driving/` +
    `${start[1]},${start[0]};` +
    `${destination[1]},${destination[0]}` +
    `?overview=full&geometries=geojson`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.code !== "Ok") {
    throw new Error("Route not found");
  }

  const coordinates: [number, number][] = data.routes[0].geometry.coordinates;
  // Convert [lng, lat] to [lat, lng] for Leaflet
  return coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
};

export const searchLocation = async (query: string) => {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(query)}` +
    `&format=json` +
    `&limit=1`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.length === 0) {
    throw new Error("Location not found");
  }

  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon)
  };
};

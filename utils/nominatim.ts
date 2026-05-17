import { Coordinate } from '../types/game';

interface NominatimResult {
  place_id: number;
  osm_type: string;
  osm_id: number;
  display_name: string;
  type: string;
  geojson?: {
    type: string;
    coordinates: number[][][] | number[][][][];
  };
}

export interface PlaceResult {
  id: number;
  name: string;
  osmType: string;
  osmId: number;
}

const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org';

export async function searchPlaces(query: string): Promise<PlaceResult[]> {
  const params = new URLSearchParams({
    q: query,
    format: 'json',
    limit: '5',
    featuretype: 'country,state,city,settlement',
  });

  const res = await fetch(`${NOMINATIM_BASE}/search?${params}`, {
    headers: { 'User-Agent': 'HideAndSeekApp/1.0' },
  });
  const data: NominatimResult[] = await res.json();

  return data.map((r) => ({
    id: r.place_id,
    name: r.display_name,
    osmType: r.osm_type,
    osmId: r.osm_id,
  }));
}

function simplifyCoords(coords: Coordinate[], maxPoints: number): Coordinate[] {
  if (coords.length <= maxPoints) return coords;
  const step = coords.length / maxPoints;
  const result: Coordinate[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(coords[Math.floor(i * step)]);
  }
  return result;
}

export async function fetchPlaceBoundary(
  osmType: string,
  osmId: number
): Promise<Coordinate[]> {
  const typePrefix = osmType.charAt(0).toUpperCase(); // R, W, N
  const params = new URLSearchParams({
    osmtype: typePrefix,
    osmid: osmId.toString(),
    format: 'json',
    polygon_geojson: '1',
    polygon_threshold: '0.001',
  });

  const res = await fetch(`${NOMINATIM_BASE}/lookup?osm_ids=${typePrefix}${osmId}&${params}`, {
    headers: { 'User-Agent': 'HideAndSeekApp/1.0' },
  });
  const data: NominatimResult[] = await res.json();

  if (!data.length || !data[0].geojson) {
    throw new Error('No boundary found for this place.');
  }

  const geo = data[0].geojson;
  let ring: number[][];

  if (geo.type === 'Polygon') {
    ring = (geo.coordinates as number[][][])[0];
  } else if (geo.type === 'MultiPolygon') {
    // Pick the largest polygon
    const polygons = geo.coordinates as number[][][][];
    let largest = polygons[0][0];
    for (const poly of polygons) {
      if (poly[0].length > largest.length) {
        largest = poly[0];
      }
    }
    ring = largest;
  } else {
    throw new Error(`Unsupported geometry: ${geo.type}`);
  }

  const coords = ring.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
  return simplifyCoords(coords, 2000);
}

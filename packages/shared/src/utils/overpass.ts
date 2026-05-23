import { Coordinate, Region } from '../types/game';

export interface TrainStop {
  id: string;
  name: string;
  coordinate: Coordinate;
}

export interface POI {
  id: string;
  name: string;
  coordinate: Coordinate;
}

export interface POICategory {
  key: string;
  label: string;
  emoji: string;
  tags: string; // Overpass QL tag filter, e.g. '["tourism"="museum"]'
}

export const POI_CATEGORIES: POICategory[] = [
  { key: 'castle',    label: 'Castle',    emoji: '🏰', tags: '["historic"="castle"]' },
  { key: 'library',   label: 'Library',   emoji: '📚', tags: '["amenity"="library"]' },
  { key: 'lake',      label: 'Lake',      emoji: '🏞️', tags: '["natural"="water"]["water"="lake"]' },
  { key: 'museum',    label: 'Museum',    emoji: '🏛️', tags: '["tourism"="museum"]' },
  { key: 'park',      label: 'Park',      emoji: '🌳', tags: '["leisure"="park"]' },
  { key: 'church',    label: 'Church',    emoji: '⛪', tags: '["amenity"="place_of_worship"]' },
  { key: 'zoo',       label: 'Zoo',       emoji: '🦁', tags: '["tourism"="zoo"]' },
  { key: 'cemetery',  label: 'Cemetery',  emoji: '🪦', tags: '["landuse"="cemetery"]' },
  { key: 'monument',  label: 'Monument',  emoji: '🗿', tags: '["historic"="monument"]' },
  { key: 'theatre',   label: 'Theatre',   emoji: '🎭', tags: '["amenity"="theatre"]' },
  { key: 'cinema',    label: 'Cinema',    emoji: '🎬', tags: '["amenity"="cinema"]' },
  { key: 'hospital',  label: 'Hospital',  emoji: '🏥', tags: '["amenity"="hospital"]' },
  { key: 'stadium',   label: 'Stadium',   emoji: '🏟️', tags: '["leisure"="stadium"]' },
];

function getBbox(regions: Region[]): {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
} {
  let minLat = 90,
    maxLat = -90,
    minLng = 180,
    maxLng = -180;
  for (const region of regions) {
    for (const c of region.coords) {
      if (c.latitude < minLat) minLat = c.latitude;
      if (c.latitude > maxLat) maxLat = c.latitude;
      if (c.longitude < minLng) minLng = c.longitude;
      if (c.longitude > maxLng) maxLng = c.longitude;
    }
  }
  return { minLat, maxLat, minLng, maxLng };
}

// Ray-casting point-in-polygon test
function isInsidePolygon(point: Coordinate, polygon: Coordinate[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const yi = polygon[i].latitude, xi = polygon[i].longitude;
    const yj = polygon[j].latitude, xj = polygon[j].longitude;
    if (
      yi > point.latitude !== yj > point.latitude &&
      point.longitude < ((xj - xi) * (point.latitude - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

function isInsideAnyRegion(point: Coordinate, regions: Region[]): boolean {
  return regions.some((r) => isInsidePolygon(point, r.coords));
}

export async function fetchTrainStops(regions: Region[]): Promise<TrainStop[]> {
  if (regions.length === 0) return [];

  const { minLat, maxLat, minLng, maxLng } = getBbox(regions);
  const bbox = `${minLat},${minLng},${maxLat},${maxLng}`;

  const query = `
    [out:json][timeout:30];
    (
      node["railway"="station"](${bbox});
      node["railway"="halt"](${bbox});
    );
    out body;
  `;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        lastError = new Error('Rate limited, retrying...');
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

      const data = await res.json();

      const allStops: TrainStop[] = (data.elements || [])
        .filter((el: any) => el.lat != null && el.lon != null)
        .map((el: any) => ({
          id: String(el.id),
          name: el.tags?.name || 'Unknown stop',
          coordinate: {
            latitude: el.lat,
            longitude: el.lon,
          },
        }));

      return allStops.filter((stop) => isInsideAnyRegion(stop.coordinate, regions));
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      if (lastError.name === 'AbortError') {
        lastError = new Error('Request timed out');
      }
    }
  }

  throw lastError ?? new Error('Failed to fetch train stops');
}

export async function fetchPOIsNearby(
  center: Coordinate,
  radiusKm: number,
  category: POICategory
): Promise<POI[]> {
  const radiusM = Math.round(radiusKm * 1000);

  const query = `
    [out:json][timeout:30];
    (
      node${category.tags}(around:${radiusM},${center.latitude},${center.longitude});
      way${category.tags}(around:${radiusM},${center.latitude},${center.longitude});
      relation${category.tags}(around:${radiusM},${center.latitude},${center.longitude});
    );
    out center;
  `;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.status === 429) {
        lastError = new Error('Rate limited, retrying...');
        await new Promise((r) => setTimeout(r, 2000));
        continue;
      }
      if (!res.ok) throw new Error(`Overpass API error: ${res.status}`);

      const data = await res.json();

      const pois: POI[] = (data.elements || [])
        .filter((el: any) => {
          const lat = el.lat ?? el.center?.lat;
          const lon = el.lon ?? el.center?.lon;
          return lat != null && lon != null && el.tags?.name;
        })
        .map((el: any) => ({
          id: String(el.id),
          name: el.tags.name,
          coordinate: {
            latitude: el.lat ?? el.center.lat,
            longitude: el.lon ?? el.center.lon,
          },
        }));

      // Sort by distance from center
      pois.sort((a, b) => {
        const dA = (a.coordinate.latitude - center.latitude) ** 2 + (a.coordinate.longitude - center.longitude) ** 2;
        const dB = (b.coordinate.latitude - center.latitude) ** 2 + (b.coordinate.longitude - center.longitude) ** 2;
        return dA - dB;
      });

      return pois;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Unknown error');
      if (lastError.name === 'AbortError') {
        lastError = new Error('Request timed out');
      }
    }
  }

  throw lastError ?? new Error('Failed to fetch POIs');
}

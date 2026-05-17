import { Coordinate, Region } from '../types/game';

export interface TrainStop {
  id: string;
  name: string;
  coordinate: Coordinate;
}

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

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  });

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

  // Filter to only stops inside the actual region polygons
  return allStops.filter((stop) => isInsideAnyRegion(stop.coordinate, regions));
}

import { Coordinate } from '../types/game';

interface GeoJsonGeometry {
  type: string;
  coordinates: number[][][] | number[][][][];
}

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

type GeoJsonInput = GeoJsonFeatureCollection | GeoJsonFeature | GeoJsonGeometry;

function lngLatToCoordinate(pair: number[]): Coordinate {
  return { latitude: pair[1], longitude: pair[0] };
}

function simplifyPolygon(coords: Coordinate[], maxPoints: number): Coordinate[] {
  if (coords.length <= maxPoints) return coords;
  const step = coords.length / maxPoints;
  const result: Coordinate[] = [];
  for (let i = 0; i < maxPoints; i++) {
    result.push(coords[Math.floor(i * step)]);
  }
  return result;
}

function extractRings(geometry: GeoJsonGeometry): number[][][] {
  if (geometry.type === 'Polygon') {
    return geometry.coordinates as number[][][];
  }
  if (geometry.type === 'MultiPolygon') {
    // Take the largest polygon (most points)
    const polygons = geometry.coordinates as number[][][][];
    let largest = polygons[0];
    for (const poly of polygons) {
      if (poly[0].length > largest[0].length) {
        largest = poly;
      }
    }
    return largest;
  }
  throw new Error(`Unsupported geometry type: ${geometry.type}. Expected Polygon or MultiPolygon.`);
}

export function parseGeoJson(raw: string): Coordinate[] {
  const data: GeoJsonInput = JSON.parse(raw);

  let geometry: GeoJsonGeometry;

  if ('type' in data && data.type === 'FeatureCollection') {
    const fc = data as GeoJsonFeatureCollection;
    const polygonFeature = fc.features.find(
      (f) => f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'
    );
    if (!polygonFeature) {
      throw new Error('No Polygon or MultiPolygon feature found in GeoJSON.');
    }
    geometry = polygonFeature.geometry;
  } else if ('type' in data && data.type === 'Feature') {
    geometry = (data as GeoJsonFeature).geometry;
  } else {
    geometry = data as GeoJsonGeometry;
  }

  const rings = extractRings(geometry);
  // Use the outer ring (first ring)
  const outerRing = rings[0];
  const coords = outerRing.map(lngLatToCoordinate);

  return simplifyPolygon(coords, 500);
}

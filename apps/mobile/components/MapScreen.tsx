import React, { forwardRef, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Polygon, Marker, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { Coordinate, Question, Region } from '@hideandseek/shared';
import type { TrainStop, POI } from '@hideandseek/shared';

interface MapScreenProps {
  regions: Region[];
  questions: Question[];
  trainStops: TrainStop[];
  tentaclePOIs: POI[];
  drawingZone: Coordinate[];
  isDrawing: boolean;
  onMapPress: (e: MapPressEvent) => void;
  onBoundaryPress: () => void;
}

const ZONE_COLORS = [
  'rgba(231, 76, 60, 0.35)',
  'rgba(230, 126, 34, 0.35)',
  'rgba(155, 89, 182, 0.35)',
  'rgba(52, 152, 219, 0.35)',
  'rgba(26, 188, 156, 0.35)',
];

// Approximate a circle as a polygon with N vertices
function circleToPolygon(
  center: Coordinate,
  radiusKm: number,
  numPoints = 64
): Coordinate[] {
  const coords: Coordinate[] = [];
  const radiusDegLat = radiusKm / 111.32;
  const radiusDegLng =
    radiusKm / (111.32 * Math.cos((center.latitude * Math.PI) / 180));
  for (let i = 0; i < numPoints; i++) {
    const angle = (2 * Math.PI * i) / numPoints;
    coords.push({
      latitude: center.latitude + radiusDegLat * Math.sin(angle),
      longitude: center.longitude + radiusDegLng * Math.cos(angle),
    });
  }
  return coords;
}

// --- Polygon boolean helpers ---

// Cross product of edge (a→b) and point p. Positive = p is left of edge.
function cross(a: Coordinate, b: Coordinate, p: Coordinate): number {
  return (
    (b.longitude - a.longitude) * (p.latitude - a.latitude) -
    (b.latitude - a.latitude) * (p.longitude - a.longitude)
  );
}

function lineIntersect(
  p1: Coordinate,
  p2: Coordinate,
  p3: Coordinate,
  p4: Coordinate
): Coordinate {
  const d =
    (p1.longitude - p2.longitude) * (p3.latitude - p4.latitude) -
    (p1.latitude - p2.latitude) * (p3.longitude - p4.longitude);
  const t =
    ((p1.longitude - p3.longitude) * (p3.latitude - p4.latitude) -
      (p1.latitude - p3.latitude) * (p3.longitude - p4.longitude)) / d;
  return {
    latitude: p1.latitude + t * (p2.latitude - p1.latitude),
    longitude: p1.longitude + t * (p2.longitude - p1.longitude),
  };
}

// Sutherland-Hodgman: clip any polygon to inside of a convex polygon
function clipToConvex(
  subject: Coordinate[],
  clip: Coordinate[]
): Coordinate[] {
  let output = [...subject];
  for (let i = 0; i < clip.length && output.length > 0; i++) {
    const input = output;
    output = [];
    const a = clip[i];
    const b = clip[(i + 1) % clip.length];
    for (let j = 0; j < input.length; j++) {
      const curr = input[j];
      const prev = input[(j + input.length - 1) % input.length];
      const cIn = cross(a, b, curr) >= 0;
      const pIn = cross(a, b, prev) >= 0;
      if (cIn) {
        if (!pIn) output.push(lineIntersect(prev, curr, a, b));
        output.push(curr);
      } else if (pIn) {
        output.push(lineIntersect(prev, curr, a, b));
      }
    }
  }
  return output;
}

// Shoelace formula for polygon area (used for comparison)
function polygonArea(coords: Coordinate[]): number {
  let area = 0;
  for (let i = 0; i < coords.length; i++) {
    const j = (i + 1) % coords.length;
    area += coords[i].longitude * coords[j].latitude;
    area -= coords[j].longitude * coords[i].latitude;
  }
  return Math.abs(area / 2);
}

// Bridge-cut: create a single polygon representing outer minus a hole
// (hole must be entirely inside outer)
function bridgeCut(
  outer: Coordinate[],
  hole: Coordinate[]
): Coordinate[] {
  // Find closest pair of vertices
  let minD = Infinity;
  let oi = 0;
  let hi = 0;
  for (let i = 0; i < outer.length; i++) {
    for (let j = 0; j < hole.length; j++) {
      const d =
        (outer[i].latitude - hole[j].latitude) ** 2 +
        (outer[i].longitude - hole[j].longitude) ** 2;
      if (d < minD) {
        minD = d;
        oi = i;
        hi = j;
      }
    }
  }
  const result: Coordinate[] = [];
  // Outer up to and including bridge point
  for (let i = 0; i <= oi; i++) result.push(outer[i]);
  // Traverse hole in reverse (opposite winding) back to start
  for (let i = 0; i <= hole.length; i++) {
    result.push(hole[(hi - i + hole.length) % hole.length]);
  }
  // Continue outer from bridge point to end
  for (let i = oi; i < outer.length; i++) result.push(outer[i]);
  return result;
}

// Build a single unified mask: one polygon covering ALL eliminated areas.
// The holes represent only the "safe" area where the hider could still be.
function buildMask(
  regions: Region[],
  questions: Question[]
): { outer: Coordinate[]; holes: Coordinate[][] } | null {
  if (regions.length === 0) return null;

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
  const pad = 30;
  const outer: Coordinate[] = [
    { latitude: minLat - pad, longitude: minLng - pad },
    { latitude: minLat - pad, longitude: maxLng + pad },
    { latitude: maxLat + pad, longitude: maxLng + pad },
    { latitude: maxLat + pad, longitude: minLng - pad },
  ];

  // Start with region polygons as safe-area holes
  let holes: Coordinate[][] = regions.map((r) => [...r.coords]);

  // Apply each radar question to shrink the safe area
  const radars = questions.filter((q) => q.radar);
  for (const q of radars) {
    const circle = circleToPolygon(q.radar!.center, q.radar!.radiusKm);

    if (q.radar!.hiderInside) {
      // Hider IS inside circle → safe area = current holes ∩ circle
      holes = holes
        .map((h) => clipToConvex(h, circle))
        .filter((h) => h.length >= 3);
    } else {
      // Hider NOT inside circle → safe area = current holes − circle
      holes = holes
        .flatMap((hole) => {
          const intersection = clipToConvex(hole, circle);
          if (intersection.length < 3) return [hole]; // No overlap, hole unchanged
          // If circle covers nearly all of hole, eliminate it
          if (polygonArea(intersection) / polygonArea(hole) > 0.99) return [];
          return [bridgeCut(hole, intersection)];
        })
        .filter((h) => h.length >= 3);
    }
  }

  // Apply each tentacle question — hider must be in the Voronoi cell
  const tentacles = questions.filter(
    (q) => q.tentacle?.voronoiCell && q.tentacle.voronoiCell.length >= 3
  );
  for (const q of tentacles) {
    const cell = q.tentacle!.voronoiCell!;
    holes = holes
      .map((h) => clipToConvex(h, cell))
      .filter((h) => h.length >= 3);
  }

  return { outer, holes };
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

const MapScreen = forwardRef<MapView, MapScreenProps>(
  ({ regions, questions, trainStops, tentaclePOIs, drawingZone, isDrawing, onMapPress, onBoundaryPress }, ref) => {
    const mask = useMemo(
      () => (regions.length > 0 ? buildMask(regions, questions) : null),
      [regions, questions]
    );

    // Only show stops inside the safe area (mask holes)
    const visibleStops = useMemo(() => {
      if (!mask || mask.holes.length === 0) return trainStops;
      return trainStops.filter((stop) =>
        mask.holes.some((hole) => isInsidePolygon(stop.coordinate, hole))
      );
    }, [trainStops, mask]);

    // Only show tentacle POIs inside the safe area
    const visiblePOIs = useMemo(() => {
      if (!mask || mask.holes.length === 0) return tentaclePOIs;
      return tentaclePOIs.filter((poi) =>
        mask.holes.some((hole) => isInsidePolygon(poi.coordinate, hole))
      );
    }, [tentaclePOIs, mask]);

    return (
      <MapView
        ref={ref}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        onPress={isDrawing ? onMapPress : undefined}
        mapType="standard"
        showsUserLocation
        showsMyLocationButton
      >
        {/* Single unified gray mask covering all eliminated areas */}
        {mask && (
          <Polygon
            coordinates={mask.outer}
            holes={mask.holes}
            strokeColor="transparent"
            fillColor="rgba(0, 0, 0, 0.4)"
          />
        )}

        {/* Boundary outline for each region */}
        {regions.map((region) => (
          <Polygon
            key={region.id}
            coordinates={region.coords}
            strokeColor="rgba(44, 62, 80, 0.4)"
            strokeWidth={1}
            fillColor="transparent"
            tappable
            onPress={onBoundaryPress}
          />
        ))}

        {questions.map((q, i) =>
          q.zone ? (
            <Polygon
              key={q.id}
              coordinates={q.zone}
              strokeColor="rgba(192, 57, 43, 0.7)"
              strokeWidth={2}
              fillColor={ZONE_COLORS[i % ZONE_COLORS.length]}
            />
          ) : null
        )}

        {drawingZone.length > 0 && (
          <Polygon
            coordinates={drawingZone}
            strokeColor="rgba(231, 76, 60, 1)"
            strokeWidth={2}
            fillColor="rgba(231, 76, 60, 0.2)"
            lineDashPattern={[10, 5]}
          />
        )}

        {/* Train stop markers — only in possible hiding area */}
        {visibleStops.map((stop) => (
          <Marker
            key={stop.id}
            coordinate={stop.coordinate}
            title={stop.name}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.trainDot} />
          </Marker>
        ))}

        {/* Tentacle POI markers */}
        {visiblePOIs.map((poi) => (
          <Marker
            key={`poi-${poi.id}`}
            coordinate={poi.coordinate}
            title={poi.name}
            anchor={{ x: 0.5, y: 0.5 }}
            tracksViewChanges={false}
          >
            <View style={styles.poiDot} />
          </Marker>
        ))}
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  trainDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#e74c3c',
    borderWidth: 1,
    borderColor: '#fff',
  },
  poiDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#e67e22',
    borderWidth: 1.5,
    borderColor: '#fff',
  },
});

export default MapScreen;

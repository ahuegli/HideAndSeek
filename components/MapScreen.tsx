import React, { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { Coordinate, Question } from '../types/game';

interface MapScreenProps {
  boundary: Coordinate[];
  questions: Question[];
  drawingZone: Coordinate[];
  isDrawing: boolean;
  onMapPress: (e: MapPressEvent) => void;
}

const ZONE_COLORS = [
  'rgba(231, 76, 60, 0.35)',
  'rgba(230, 126, 34, 0.35)',
  'rgba(155, 89, 182, 0.35)',
  'rgba(52, 152, 219, 0.35)',
  'rgba(26, 188, 156, 0.35)',
];

// Build a padded bounding box around the boundary and use the boundary
// itself as a hole, so the gray fill follows the exact outline.
function buildMask(boundary: Coordinate[]): {
  outer: Coordinate[];
  hole: Coordinate[];
} {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
  for (const c of boundary) {
    if (c.latitude < minLat) minLat = c.latitude;
    if (c.latitude > maxLat) maxLat = c.latitude;
    if (c.longitude < minLng) minLng = c.longitude;
    if (c.longitude > maxLng) maxLng = c.longitude;
  }
  const pad = 30;
  const outer: Coordinate[] = [
    { latitude: minLat - pad, longitude: minLng - pad },
    { latitude: minLat - pad, longitude: maxLng + pad },
    { latitude: maxLat + pad, longitude: maxLng + pad },
    { latitude: maxLat + pad, longitude: minLng - pad },
  ];
  // Return boundary as-is for the hole — react-native-maps will
  // cut it out. We also provide a reversed copy so we can try
  // whichever winding the provider needs.
  return { outer, hole: boundary };
}

const MapScreen = forwardRef<MapView, MapScreenProps>(
  ({ boundary, questions, drawingZone, isDrawing, onMapPress }, ref) => {
    const mask = useMemo(
      () => (boundary.length > 0 ? buildMask(boundary) : null),
      [boundary]
    );

    return (
      <MapView
        ref={ref}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        onPress={isDrawing ? onMapPress : undefined}
        mapType="standard"
      >
        {/* Gray mask with boundary cutout */}
        {mask && (
          <Polygon
            coordinates={mask.outer}
            holes={[mask.hole]}
            strokeColor="transparent"
            fillColor="rgba(0, 0, 0, 0.4)"
          />
        )}

        {boundary.length > 0 && (
          <Polygon
            coordinates={boundary}
            strokeColor="rgba(44, 62, 80, 0.9)"
            strokeWidth={3}
            fillColor="transparent"
          />
        )}

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
      </MapView>
    );
  }
);

const styles = StyleSheet.create({
  map: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default MapScreen;

import React, { forwardRef, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import MapView, { Polygon, PROVIDER_GOOGLE, MapPressEvent } from 'react-native-maps';
import { Coordinate, Question, Region } from '../types/game';

interface MapScreenProps {
  regions: Region[];
  questions: Question[];
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

// Build a padded bounding box around all regions and use each region
// as a hole, so the gray fill covers everything outside all regions.
function buildMask(regions: Region[]): {
  outer: Coordinate[];
  holes: Coordinate[][];
} {
  let minLat = 90, maxLat = -90, minLng = 180, maxLng = -180;
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
  return { outer, holes: regions.map((r) => r.coords) };
}

const MapScreen = forwardRef<MapView, MapScreenProps>(
  ({ regions, questions, drawingZone, isDrawing, onMapPress, onBoundaryPress }, ref) => {
    const mask = useMemo(
      () => (regions.length > 0 ? buildMask(regions) : null),
      [regions]
    );

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
        {/* Gray mask with cutouts for all regions */}
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

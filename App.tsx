import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import MapView, { MapPressEvent } from 'react-native-maps';
import MapScreen from './components/MapScreen';
import QuestionSheet from './components/QuestionSheet';
import ZoneDrawer from './components/ZoneDrawer';
import PlaceSearch from './components/PlaceSearch';
import { Coordinate, Game, Question, Region } from './types/game';
import { fetchPlaceBoundary, PlaceResult } from './utils/nominatim';
import { fetchTrainStops, TrainStop } from './utils/overpass';
import { saveGame, loadGame, clearGame } from './utils/storage';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function App() {
  const mapRef = useRef<MapView>(null);

  const [regions, setRegions] = useState<Region[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameId, setGameId] = useState<string>(generateId());

  const [showQuestions, setShowQuestions] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loadingBoundary, setLoadingBoundary] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingZone, setDrawingZone] = useState<Coordinate[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<{ text: string; answer: string } | null>(null);
  const [trainStops, setTrainStops] = useState<TrainStop[]>([]);
  const [showTrainStops, setShowTrainStops] = useState(false);
  const [loadingStops, setLoadingStops] = useState(false);

  // Request location permission
  useEffect(() => {
    Location.requestForegroundPermissionsAsync();
  }, []);

  // Load saved game on mount
  useEffect(() => {
    loadGame().then((saved) => {
      if (saved) {
        setRegions(saved.regions || []);
        setQuestions(saved.questions);
        setGameId(saved.id);
        const allCoords = (saved.regions || []).flatMap((r) => r.coords);
        if (allCoords.length > 0) {
          setTimeout(() => fitToBoundary(allCoords), 500);
        }
      }
    });
  }, []);

  // Persist game state on changes
  useEffect(() => {
    const game: Game = {
      id: gameId,
      regions,
      questions,
      createdAt: Date.now(),
    };
    saveGame(game);
  }, [regions, questions, gameId]);

  const fitToBoundary = (coords: Coordinate[]) => {
    mapRef.current?.fitToCoordinates(coords, {
      edgePadding: { top: 80, right: 40, bottom: 80, left: 40 },
      animated: true,
    });
  };

  const handlePlaceSelect = useCallback(async (place: PlaceResult) => {
    setShowPlaceSearch(false);
    setLoadingBoundary(true);
    try {
      const coords = await fetchPlaceBoundary(place.osmType, place.osmId);
      const newRegion: Region = {
        id: generateId(),
        name: place.name,
        coords,
      };
      setRegions((prev) => [...prev, newRegion]);
      setTrainStops([]);
      const allCoords = [...regions.flatMap((r) => r.coords), ...coords];
      setTimeout(() => fitToBoundary(allCoords), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Boundary Error', message);
    } finally {
      setLoadingBoundary(false);
    }
  }, [regions]);

  const handleAddQuestion = useCallback((text: string, answer: string) => {
    setPendingQuestion({ text, answer });
    setShowQuestions(false);
    setIsDrawing(true);
    setDrawingZone([]);
  }, []);

  const handleAddRadar = useCallback(async (radiusKm: number, hiderInside: boolean) => {
    setShowQuestions(false);
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      const question: Question = {
        id: generateId(),
        type: 'radar',
        text: `Radar: ${radiusKm} km`,
        answer: hiderInside ? 'Inside' : 'Outside',
        zone: null,
        radar: {
          center: {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          },
          radiusKm,
          hiderInside,
        },
        timestamp: Date.now(),
      };
      setQuestions((prev) => [...prev, question]);
    } catch {
      Alert.alert('Location Error', 'Could not get your current location.');
    }
  }, []);

  const handleEditRadar = useCallback((id: string, radiusKm: number, hiderInside: boolean) => {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === id && q.radar
          ? {
              ...q,
              text: `Radar: ${radiusKm} km`,
              answer: hiderInside ? 'Inside' : 'Outside',
              radar: { ...q.radar, radiusKm, hiderInside },
            }
          : q
      )
    );
  }, []);

  const handleLocateRadar = useCallback((id: string) => {
    const q = questions.find((q) => q.id === id);
    if (!q?.radar) return;
    setShowQuestions(false);
    mapRef.current?.animateToRegion({
      ...q.radar.center,
      latitudeDelta: (q.radar.radiusKm / 111.32) * 3,
      longitudeDelta: (q.radar.radiusKm / 111.32) * 3,
    }, 500);
  }, [questions]);

  const handleMapPress = useCallback((e: MapPressEvent) => {
    const { latitude, longitude } = e.nativeEvent.coordinate;
    setDrawingZone((prev) => [...prev, { latitude, longitude }]);
  }, []);

  const handleUndoPoint = useCallback(() => {
    setDrawingZone((prev) => prev.slice(0, -1));
  }, []);

  const handleConfirmZone = useCallback(() => {
    if (!pendingQuestion) return;
    const question: Question = {
      id: generateId(),
      type: 'freeform',
      text: pendingQuestion.text,
      answer: pendingQuestion.answer,
      zone: drawingZone.length >= 3 ? drawingZone : null,
      radar: null,
      timestamp: Date.now(),
    };
    setQuestions((prev) => [...prev, question]);
    setIsDrawing(false);
    setDrawingZone([]);
    setPendingQuestion(null);
  }, [pendingQuestion, drawingZone]);

  const handleCancelZone = useCallback(() => {
    if (!pendingQuestion) return;
    // Save question without a zone
    const question: Question = {
      id: generateId(),
      type: 'freeform',
      text: pendingQuestion.text,
      answer: pendingQuestion.answer,
      zone: null,
      radar: null,
      timestamp: Date.now(),
    };
    setQuestions((prev) => [...prev, question]);
    setIsDrawing(false);
    setDrawingZone([]);
    setPendingQuestion(null);
  }, [pendingQuestion]);

  const handleBoundaryPress = useCallback(() => {
    setShowPlaceSearch(true);
  }, []);

  const handleDeleteRegion = useCallback((regionId: string) => {
    setRegions((prev) => prev.filter((r) => r.id !== regionId));
    setTrainStops([]);
  }, []);

  const handleBoundaryButton = useCallback(() => {
    setShowPlaceSearch(true);
  }, []);

  const handleNewGame = useCallback(() => {
    Alert.alert('New Game', 'Clear all data and start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          setRegions([]);
          setQuestions([]);
          setGameId(generateId());
          setIsDrawing(false);
          setDrawingZone([]);
          setPendingQuestion(null);
          setShowQuestions(false);
          setTrainStops([]);
          setShowTrainStops(false);
          clearGame();
        },
      },
    ]);
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <MapScreen
        ref={mapRef}
        regions={regions}
        questions={questions}
        trainStops={showTrainStops ? trainStops : []}
        drawingZone={drawingZone}
        isDrawing={isDrawing}
        onMapPress={handleMapPress}
        onBoundaryPress={handleBoundaryPress}
      />

      <ZoneDrawer
        visible={isDrawing}
        points={drawingZone}
        onUndo={handleUndoPoint}
        onConfirm={handleConfirmZone}
        onCancel={handleCancelZone}
      />

      {!isDrawing && !showQuestions && !showPlaceSearch && !showSettings && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={handleBoundaryButton}>
            <Text style={styles.fabIcon}>🗺</Text>
            <Text style={styles.fabLabel}>{loadingBoundary ? 'Loading...' : regions.length > 0 ? `${regions.length} region${regions.length > 1 ? 's' : ''}` : 'Boundary'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setShowQuestions(true)}
          >
            <Text style={styles.fabIcon}>❓</Text>
            <Text style={styles.fabLabel}>Questions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setShowSettings(true)}>
            <Text style={styles.fabIcon}>⚙️</Text>
            <Text style={styles.fabLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}

      {showSettings && (
        <View style={styles.settingsOverlay}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHeader}>
              <Text style={styles.settingsTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettings(false)}>
                <Text style={styles.settingsClose}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.settingsToggleItem}>
              <Text style={styles.settingsItemIcon}>🚂</Text>
              <Text style={[styles.settingsItemText, { flex: 1 }]}>
                {loadingStops ? 'Loading stops...' : 'Train Stops'}
              </Text>
              <Switch
                value={showTrainStops}
                disabled={loadingStops}
                onValueChange={async (value) => {
                  if (!value) {
                    setShowTrainStops(false);
                    return;
                  }
                  if (regions.length === 0) {
                    Alert.alert('No Boundary', 'Set a playing field boundary first.');
                    return;
                  }
                  if (trainStops.length > 0) {
                    setShowTrainStops(true);
                    return;
                  }
                  setLoadingStops(true);
                  try {
                    const stops = await fetchTrainStops(regions);
                    setTrainStops(stops);
                    setShowTrainStops(true);
                  } catch {
                    Alert.alert('Error', 'Could not fetch train stops.');
                  } finally {
                    setLoadingStops(false);
                  }
                }}
              />
            </View>
            <TouchableOpacity
              style={styles.settingsItem}
              onPress={() => {
                setShowSettings(false);
                handleNewGame();
              }}
            >
              <Text style={styles.settingsItemIcon}>🔄</Text>
              <Text style={styles.settingsItemText}>New Game</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <QuestionSheet
        questions={questions}
        visible={showQuestions}
        onClose={() => setShowQuestions(false)}
        onAddQuestion={handleAddQuestion}
        onAddRadar={handleAddRadar}
        onEditRadar={handleEditRadar}
        onLocateRadar={handleLocateRadar}
      />

      <PlaceSearch
        visible={showPlaceSearch}
        regions={regions}
        onSelect={handlePlaceSelect}
        onDeleteRegion={handleDeleteRegion}
        onClose={() => setShowPlaceSearch(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fab: {
    position: 'absolute',
    bottom: 40,
    right: 16,
    gap: 10,
    alignItems: 'flex-end',
  },
  fabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
    gap: 6,
  },
  fabIcon: {
    fontSize: 18,
  },
  fabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2c3e50',
  },
  settingsOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  settingsSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  settingsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  settingsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2c3e50',
  },
  settingsClose: {
    fontSize: 22,
    color: '#7f8c8d',
    padding: 4,
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
    gap: 12,
  },
  settingsToggleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ecf0f1',
    gap: 12,
  },
  settingsItemIcon: {
    fontSize: 20,
  },
  settingsItemText: {
    fontSize: 16,
    color: '#2c3e50',
    fontWeight: '500',
  },
});

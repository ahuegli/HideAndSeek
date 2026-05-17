import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  Text,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import MapView, { MapPressEvent } from 'react-native-maps';
import MapScreen from './components/MapScreen';
import QuestionSheet from './components/QuestionSheet';
import ZoneDrawer from './components/ZoneDrawer';
import PlaceSearch from './components/PlaceSearch';
import { Coordinate, Game, Question } from './types/game';
import { fetchPlaceBoundary, PlaceResult } from './utils/nominatim';
import { saveGame, loadGame, clearGame } from './utils/storage';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function App() {
  const mapRef = useRef<MapView>(null);

  const [boundary, setBoundary] = useState<Coordinate[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gameId, setGameId] = useState<string>(generateId());

  const [showQuestions, setShowQuestions] = useState(false);
  const [showPlaceSearch, setShowPlaceSearch] = useState(false);
  const [loadingBoundary, setLoadingBoundary] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingZone, setDrawingZone] = useState<Coordinate[]>([]);
  const [pendingQuestion, setPendingQuestion] = useState<{ text: string; answer: string } | null>(null);

  // Load saved game on mount
  useEffect(() => {
    loadGame().then((saved) => {
      if (saved) {
        setBoundary(saved.boundary);
        setQuestions(saved.questions);
        setGameId(saved.id);
        if (saved.boundary.length > 0) {
          setTimeout(() => fitToBoundary(saved.boundary), 500);
        }
      }
    });
  }, []);

  // Persist game state on changes
  useEffect(() => {
    const game: Game = {
      id: gameId,
      boundary,
      questions,
      createdAt: Date.now(),
    };
    saveGame(game);
  }, [boundary, questions, gameId]);

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
      setBoundary(coords);
      setTimeout(() => fitToBoundary(coords), 300);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Boundary Error', message);
    } finally {
      setLoadingBoundary(false);
    }
  }, []);

  const handleAddQuestion = useCallback((text: string, answer: string) => {
    setPendingQuestion({ text, answer });
    setShowQuestions(false);
    setIsDrawing(true);
    setDrawingZone([]);
  }, []);

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
      text: pendingQuestion.text,
      answer: pendingQuestion.answer,
      zone: drawingZone.length >= 3 ? drawingZone : null,
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
      text: pendingQuestion.text,
      answer: pendingQuestion.answer,
      zone: null,
      timestamp: Date.now(),
    };
    setQuestions((prev) => [...prev, question]);
    setIsDrawing(false);
    setDrawingZone([]);
    setPendingQuestion(null);
  }, [pendingQuestion]);

  const handleNewGame = useCallback(() => {
    Alert.alert('New Game', 'Clear all data and start fresh?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'New Game',
        style: 'destructive',
        onPress: () => {
          setBoundary([]);
          setQuestions([]);
          setGameId(generateId());
          setIsDrawing(false);
          setDrawingZone([]);
          setPendingQuestion(null);
          setShowQuestions(false);
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
        boundary={boundary}
        questions={questions}
        drawingZone={drawingZone}
        isDrawing={isDrawing}
        onMapPress={handleMapPress}
      />

      <ZoneDrawer
        visible={isDrawing}
        points={drawingZone}
        onUndo={handleUndoPoint}
        onConfirm={handleConfirmZone}
        onCancel={handleCancelZone}
      />

      {!isDrawing && !showQuestions && !showPlaceSearch && (
        <View style={styles.fab}>
          <TouchableOpacity style={styles.fabBtn} onPress={() => setShowPlaceSearch(true)}>
            <Text style={styles.fabIcon}>🗺</Text>
            <Text style={styles.fabLabel}>{loadingBoundary ? 'Loading...' : 'Boundary'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.fabBtn}
            onPress={() => setShowQuestions(true)}
          >
            <Text style={styles.fabIcon}>❓</Text>
            <Text style={styles.fabLabel}>Questions</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.fabBtnDanger} onPress={handleNewGame}>
            <Text style={styles.fabIcon}>🔄</Text>
            <Text style={styles.fabLabel}>New</Text>
          </TouchableOpacity>
        </View>
      )}

      <QuestionSheet
        questions={questions}
        visible={showQuestions}
        onClose={() => setShowQuestions(false)}
        onAddQuestion={handleAddQuestion}
      />

      <PlaceSearch
        visible={showPlaceSearch}
        onSelect={handlePlaceSelect}
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
  fabBtnDanger: {
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
});

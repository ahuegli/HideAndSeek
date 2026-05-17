import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game } from '../types/game';

const GAME_KEY = 'hide_and_seek_game';

export async function saveGame(game: Game): Promise<void> {
  await AsyncStorage.setItem(GAME_KEY, JSON.stringify(game));
}

export async function loadGame(): Promise<Game | null> {
  const raw = await AsyncStorage.getItem(GAME_KEY);
  if (!raw) return null;
  return JSON.parse(raw) as Game;
}

export async function clearGame(): Promise<void> {
  await AsyncStorage.removeItem(GAME_KEY);
}

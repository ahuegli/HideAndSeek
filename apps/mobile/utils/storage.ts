import AsyncStorage from '@react-native-async-storage/async-storage';
import { Game, GameStore } from '@hideandseek/shared';

const GAME_KEY = 'hide_and_seek_game';

export class LocalStore implements GameStore {
  async saveGame(game: Game): Promise<void> {
    await AsyncStorage.setItem(GAME_KEY, JSON.stringify(game));
  }

  async loadGame(): Promise<Game | null> {
    const raw = await AsyncStorage.getItem(GAME_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Game;
  }

  async clearGame(): Promise<void> {
    await AsyncStorage.removeItem(GAME_KEY);
  }
}

// Default instance for backward compatibility
const localStore = new LocalStore();
export const saveGame = (game: Game) => localStore.saveGame(game);
export const loadGame = () => localStore.loadGame();
export const clearGame = () => localStore.clearGame();

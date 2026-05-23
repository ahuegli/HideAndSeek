import { Game } from '../types/game';

export interface GameStore {
  saveGame(game: Game): Promise<void>;
  loadGame(): Promise<Game | null>;
  clearGame(): Promise<void>;
}

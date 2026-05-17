export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Question {
  id: string;
  text: string;
  answer: string;
  zone: Coordinate[] | null;
  timestamp: number;
}

export interface Game {
  id: string;
  boundary: Coordinate[];
  questions: Question[];
  createdAt: number;
}

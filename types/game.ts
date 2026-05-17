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

export interface Region {
  id: string;
  name: string;
  coords: Coordinate[];
}

export interface Game {
  id: string;
  regions: Region[];
  questions: Question[];
  createdAt: number;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type QuestionType = 'freeform' | 'radar' | 'district' | 'tentacle';

export interface RadarData {
  center: Coordinate;
  radiusKm: number;
  hiderInside: boolean;
}

export interface DistrictData {
  district: string;
  sameDistrict: boolean;
}

export interface TentacleData {
  category: string;
  answer: string;
  voronoiCell: Coordinate[] | null;
}

export interface Question {
  id: string;
  type: QuestionType;
  text: string;
  answer: string;
  zone: Coordinate[] | null;
  radar: RadarData | null;
  district: DistrictData | null;
  tentacle: TentacleData | null;
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

export interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: string;
  best: number;
  plays: string;
}

export interface ScoreRow {
  id: string;
  game_id: string;
  user_id: string | null;
  name: string;
  score: number;
  created_at: string;
}

export interface GameHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void;
}

export interface GameProps {
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}

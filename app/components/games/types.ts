import type { GamePalette } from "../../data/skins";

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
  /**
   * Paleta de la skin activa. El juego debe copiarla a un ref en cada render
   * (`paletteRef.current = palette`) y leer ese ref dentro de su draw(),
   * nunca la prop directamente — el loop vive en un useEffect(..., []) que
   * no se vuelve a ejecutar cuando cambia la skin.
   */
  palette: GamePalette;
}

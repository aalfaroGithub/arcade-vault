import { ComponentType, RefAttributes } from "react";
import type { GameHandle, GameProps } from "../components/games/types";
import Asteroids from "../components/games/Asteroids";
import Tetris from "../components/games/Tetris";

export interface RealGameEntry {
  component: ComponentType<GameProps & RefAttributes<GameHandle>>;
}

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { component: Asteroids },
  caida: { component: Tetris },
};

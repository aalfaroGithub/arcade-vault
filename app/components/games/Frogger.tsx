"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GameHandle, GameProps } from "./types";

const COLS = 16;
const ROWS = 14;
const CELL = 40;
const CANVAS_W = COLS * CELL; // 640
const CANVAS_H = ROWS * CELL; // 560

// Filas (0 = arriba)
const ROW_GOALS = 0;
const ROW_RIVER_TOP = 1;
const ROW_RIVER_BOT = 6;
const ROW_SAFE_MID = 7;
const ROW_ROAD_TOP = 8;
const ROW_ROAD_BOT = 12;
const ROW_START = 13;

const JUMP_MS = 120;
const ROUND_TIME_INITIAL_S = 15;
const LIVES_INITIAL = 3;
const SPEED_STEP_PER_LEVEL = 0.15;
const GOAL_COUNT = 5;
const GOAL_WIDTH = 2; // columnas por boca

// Colores de zona fijos (no dependen de la skin activa — solo las entidades
// se tiñen con paletteRef; ver comentario de `entities` en skins.ts).
const ZONE_COLOR = {
  road: "#0a0a0a",
  river: "#0b2b4a",
  safe: "#0d2b12",
  goal: "#123d1a",
};

type Direction = "up" | "down" | "left" | "right";

interface Entity {
  col: number;
  width: number;
  type: "car" | "truck" | "log" | "turtle";
  submerged?: boolean;
}

interface Lane {
  row: number;
  speed: number;
  dir: 1 | -1;
  entities: Entity[];
}

interface Frog {
  col: number;
  row: number;
  animating: boolean;
  animT: number;
  targetCol: number;
  targetRow: number;
}

type GameState = "playing" | "gameover";

const Frogger = forwardRef<GameHandle, GameProps>(function Frogger(
  { onStateChange, onGameOver, palette },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<GameHandle | null>(null);
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  useImperativeHandle(
    ref,
    () => ({
      pause() {
        controlsRef.current?.pause();
      },
      resume() {
        controlsRef.current?.resume();
      },
      forceGameOver() {
        controlsRef.current?.forceGameOver();
      },
    }),
    [],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const lanes: Lane[] = [];
    const frog: Frog = {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    };
    const goals: boolean[] = Array(GOAL_COUNT).fill(false);
    const score = 0;
    const lives = LIVES_INITIAL;
    const level = 1;
    const roundTimer = ROUND_TIME_INITIAL_S;
    let state: GameState = "playing";
    let pendingDir: Direction | null = null;

    function zoneColorForRow(row: number): string {
      if (row === ROW_GOALS) return ZONE_COLOR.goal;
      if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT) return ZONE_COLOR.river;
      if (row === ROW_SAFE_MID) return ZONE_COLOR.safe;
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT) return ZONE_COLOR.road;
      return ZONE_COLOR.safe; // ROW_START
    }

    function draw() {
      for (let row = 0; row < ROWS; row++) {
        ctx!.fillStyle = zoneColorForRow(row);
        ctx!.fillRect(0, row * CELL, CANVAS_W, CELL);
      }

      // Bocas destino: marco dorado, relleno si ocupada.
      const goalSpanCols = COLS / GOAL_COUNT;
      for (let g = 0; g < GOAL_COUNT; g++) {
        const x = g * goalSpanCols * CELL;
        ctx!.strokeStyle = "#d4af37";
        ctx!.lineWidth = 2;
        ctx!.strokeRect(
          x + 2,
          ROW_GOALS * CELL + 2,
          GOAL_WIDTH * CELL - 4,
          CELL - 4,
        );
        if (goals[g]) {
          ctx!.fillStyle = paletteRef.current.entities[4] ?? "#7cff5e";
          ctx!.fillRect(
            x + 6,
            ROW_GOALS * CELL + 6,
            GOAL_WIDTH * CELL - 12,
            CELL - 12,
          );
        }
      }

      // Placeholder de rana (formas reales llegan en el paso 6).
      ctx!.fillStyle = paletteRef.current.entities[4] ?? "#7cff5e";
      ctx!.fillRect(
        frog.col * CELL + 6,
        frog.row * CELL + 6,
        CELL - 12,
        CELL - 12,
      );

      // Placeholder de carriles registrados (entidades reales llegan en el paso 2).
      void lanes;
    }

    let lastReportedScore = -1;
    let lastReportedLevel = -1;
    let lastReportedLives = -1;
    let gameOverReported = false;

    function reportState() {
      if (
        score !== lastReportedScore ||
        level !== lastReportedLevel ||
        lives !== lastReportedLives
      ) {
        lastReportedScore = score;
        lastReportedLevel = level;
        lastReportedLives = lives;
        onStateChange({ score, lives, level });
      }
      if (state === "gameover" && !gameOverReported) {
        gameOverReported = true;
        onGameOver(score);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      const dir = KEY_TO_DIR[e.code];
      if (!dir) return;
      e.preventDefault();
      if (state !== "playing") return;
      pendingDir = dir;
    }
    window.addEventListener("keydown", onKeyDown);

    let lastTime: number | null = null;
    let rafId = 0;
    let paused = false;

    function loop(ts: number) {
      if (paused) return;
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 100);
      lastTime = ts;
      void dt;
      reportState();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    controlsRef.current = {
      pause() {
        if (paused) return;
        paused = true;
        cancelAnimationFrame(rafId);
      },
      resume() {
        if (!paused) return;
        paused = false;
        lastTime = null;
        rafId = requestAnimationFrame(loop);
      },
      forceGameOver() {
        state = "gameover";
      },
    };

    draw();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      controlsRef.current = null;
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_W}
      height={CANVAS_H}
      style={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        height: "100%",
        width: "auto",
      }}
    />
  );
});

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

export default Frogger;

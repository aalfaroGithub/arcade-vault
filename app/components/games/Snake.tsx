"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GameHandle, GameProps } from "./types";
import type { GamePalette } from "../../data/skins";

/**
 * Aplica el glow de la skin activa al relleno siguiente. Con `palette.glow === 0`
 * (skins clasico y retro) no toca el resultado: un shadowBlur de 0 no dibuja
 * sombra. Debe llamarse dentro de un save()/restore().
 */
function applyGlow(
  ctx: CanvasRenderingContext2D,
  palette: GamePalette,
  color: string,
) {
  if (palette.glow <= 0) return;
  ctx.shadowBlur = palette.glow;
  ctx.shadowColor = color;
}

const COLS = 20;
const ROWS = 15;
const CELL = 40;
const CANVAS_W = COLS * CELL;
const CANVAS_H = ROWS * CELL;

const TICK_INITIAL_MS = 150;
const TICK_STEP_MS = 12;
const TICK_MIN_MS = 60;
const FRUITS_PER_LEVEL = 5;
const SCORE_PER_FRUIT = 10;

// Atlas de sprites embebido, portado de references/source-assets/snake-assets/sprites.js
// (solo la fila pixel-art de frutas, y=136-295, dentro de fruits.png).
const FRUIT_SPRITES: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  grape: { x: 378, y: 136, w: 110, h: 160 },
  garlic: { x: 540, y: 136, w: 130, h: 160 },
  eggplant: { x: 712, y: 136, w: 130, h: 160 },
  strawberry: { x: 894, y: 136, w: 110, h: 160 },
  cherry: { x: 1066, y: 136, w: 110, h: 160 },
  carrot: { x: 1228, y: 136, w: 130, h: 160 },
  mushroom: { x: 1400, y: 136, w: 130, h: 160 },
  broccoli: { x: 1582, y: 136, w: 110, h: 160 },
  watermelon: { x: 1734, y: 136, w: 150, h: 160 },
  pepper: { x: 1906, y: 136, w: 150, h: 160 },
  kiwi: { x: 2068, y: 136, w: 170, h: 160 },
  lemon: { x: 2250, y: 136, w: 140, h: 160 },
  peach: { x: 2432, y: 136, w: 130, h: 160 },
  peanut: { x: 2604, y: 136, w: 130, h: 160 },
  apple: { x: 2786, y: 136, w: 110, h: 160 },
  tomato: { x: 2948, y: 136, w: 130, h: 160 },
  berries: { x: 3110, y: 136, w: 150, h: 160 },
  grapes2: { x: 3302, y: 136, w: 110, h: 160 },
  pineapple: { x: 3454, y: 136, w: 150, h: 160 },
  melon: { x: 3637, y: 136, w: 130, h: 160 },
};
const FRUIT_KEYS = Object.keys(FRUIT_SPRITES);

interface Cell {
  col: number;
  row: number;
}

type Direction = "up" | "down" | "left" | "right";

const DIR_DELTA: Record<Direction, Cell> = {
  up: { col: 0, row: -1 },
  down: { col: 0, row: 1 },
  left: { col: -1, row: 0 },
  right: { col: 1, row: 0 },
};

const OPPOSITE: Record<Direction, Direction> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
};

type GameState = "playing" | "gameover";

const Snake = forwardRef<GameHandle, GameProps>(function Snake(
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

    let cancelled = false;
    let fruitsImg: HTMLImageElement | null = null;
    let fruitsLoaded = false;

    const snake: Cell[] = [
      { col: 10, row: 7 },
      { col: 9, row: 7 },
      { col: 8, row: 7 },
    ];
    let dir: Direction = "right";
    let nextDir: Direction = "right";
    let fruit: Cell & { spriteKey: string } = spawnFruit();
    let score = 0;
    let level = 1;
    let fruitsEatenThisLevel = 0;
    let tickMs = TICK_INITIAL_MS;
    let tickAccum = 0;
    let state: GameState = "playing";

    function spawnFruit(): Cell & { spriteKey: string } {
      let cell: Cell;
      do {
        cell = {
          col: Math.floor(Math.random() * COLS),
          row: Math.floor(Math.random() * ROWS),
        };
      } while (snake.some((s) => s.col === cell.col && s.row === cell.row));
      const spriteKey =
        FRUIT_KEYS[Math.floor(Math.random() * FRUIT_KEYS.length)];
      return { ...cell, spriteKey };
    }

    function onKeyDown(e: KeyboardEvent) {
      const nd = KEY_TO_DIR[e.code];
      if (!nd) return;
      e.preventDefault();
      if (state !== "playing") return;
      if (nd === OPPOSITE[dir]) return;
      nextDir = nd;
    }
    window.addEventListener("keydown", onKeyDown);

    function step() {
      dir = nextDir;
      const delta = DIR_DELTA[dir];
      const head = snake[0];
      const newHead: Cell = {
        col: head.col + delta.col,
        row: head.row + delta.row,
      };

      if (
        newHead.col < 0 ||
        newHead.col >= COLS ||
        newHead.row < 0 ||
        newHead.row >= ROWS
      ) {
        state = "gameover";
        return;
      }
      const willEat = newHead.col === fruit.col && newHead.row === fruit.row;
      // La cola libera su celda este mismo tick si la serpiente no crece,
      // así que no cuenta como colisión en ese caso.
      const bodyToCheck = willEat ? snake : snake.slice(0, -1);
      if (
        bodyToCheck.some((s) => s.col === newHead.col && s.row === newHead.row)
      ) {
        state = "gameover";
        return;
      }

      snake.unshift(newHead);

      if (willEat) {
        score += SCORE_PER_FRUIT;
        fruitsEatenThisLevel++;
        if (fruitsEatenThisLevel >= FRUITS_PER_LEVEL) {
          fruitsEatenThisLevel = 0;
          level++;
          tickMs = Math.max(TICK_MIN_MS, tickMs - TICK_STEP_MS);
        }
        fruit = spawnFruit();
      } else {
        snake.pop();
      }
    }

    function draw() {
      ctx!.fillStyle = paletteRef.current.bg;
      ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H);

      ctx!.strokeStyle = paletteRef.current.grid;
      ctx!.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx!.beginPath();
        ctx!.moveTo(c * CELL, 0);
        ctx!.lineTo(c * CELL, CANVAS_H);
        ctx!.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx!.beginPath();
        ctx!.moveTo(0, r * CELL);
        ctx!.lineTo(CANVAS_W, r * CELL);
        ctx!.stroke();
      }

      if (fruitsLoaded && fruitsImg) {
        const sp = FRUIT_SPRITES[fruit.spriteKey];
        const pad = 4;
        ctx!.drawImage(
          fruitsImg,
          sp.x,
          sp.y,
          sp.w,
          sp.h,
          fruit.col * CELL + pad,
          fruit.row * CELL + pad,
          CELL - pad * 2,
          CELL - pad * 2,
        );
      }

      // La serpiente (no la fruta) recibe el glow de la skin activa.
      ctx!.save();
      for (let i = snake.length - 1; i >= 0; i--) {
        const seg = snake[i];
        const isHead = i === 0;
        const color = isHead
          ? paletteRef.current.entities[0]
          : paletteRef.current.entities[1];
        ctx!.fillStyle = color;
        applyGlow(ctx!, paletteRef.current, color);
        ctx!.fillRect(
          seg.col * CELL + 1,
          seg.row * CELL + 1,
          CELL - 2,
          CELL - 2,
        );
        if (isHead) {
          ctx!.shadowBlur = 0;
          ctx!.fillStyle = paletteRef.current.ink;
          ctx!.fillRect(seg.col * CELL + 1, seg.row * CELL + 1, CELL - 2, 6);
        }
      }
      ctx!.restore();
    }

    let lastReportedScore = -1;
    let lastReportedLevel = -1;
    let lastReportedLives = -1;
    let gameOverReported = false;

    function reportState() {
      const lives = state === "playing" ? 1 : 0;
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

    let lastTime: number | null = null;
    let rafId = 0;
    let paused = false;

    function loop(ts: number) {
      if (paused) return;
      const dt = lastTime === null ? 0 : Math.min(ts - lastTime, 100);
      lastTime = ts;
      if (state === "playing") {
        tickAccum += dt;
        while (tickAccum >= tickMs && state === "playing") {
          tickAccum -= tickMs;
          step();
        }
      }
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

    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      fruitsImg = img;
      fruitsLoaded = true;
    };
    img.onerror = () => console.error("Failed to load fruits sprite sheet");
    img.src = "/games/serpentina/fruits.png";

    rafId = requestAnimationFrame(loop);

    return () => {
      cancelled = true;
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

export default Snake;

"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GameHandle, GameProps } from "./types";

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;
const NEXT_BLOCK = 30;

const COLORS: (string | null)[] = [
  null,
  "#4dd0e1", // I - cyan
  "#ffd54f", // O - yellow
  "#ba68c8", // T - purple
  "#81c784", // S - green
  "#e57373", // Z - red
  "#90caf9", // J - pale blue
  "#ffb74d", // L - orange
  "#9e9e9e", // N - tuerca (gris metálico)
];

const PIECES: (number[][] | null)[] = [
  null,
  [
    [0, 0, 0, 0],
    [1, 1, 1, 1],
    [0, 0, 0, 0],
    [0, 0, 0, 0],
  ], // I
  [
    [2, 2],
    [2, 2],
  ], // O
  [
    [0, 3, 0],
    [3, 3, 3],
    [0, 0, 0],
  ], // T
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0],
  ], // S
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0],
  ], // Z
  [
    [6, 0, 0],
    [6, 6, 6],
    [0, 0, 0],
  ], // J
  [
    [0, 0, 7],
    [7, 7, 7],
    [0, 0, 0],
  ], // L
  [
    [8, 8, 8],
    [8, 0, 8],
    [8, 8, 8],
  ], // N (tuerca)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

interface Piece {
  type: number;
  shape: number[][];
  x: number;
  y: number;
}

type GameState = "playing" | "gameover";

const Tetris = forwardRef<GameHandle, GameProps>(function Tetris(
  { onStateChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nextCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const controlsRef = useRef<GameHandle | null>(null);

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
    const nextCanvas = nextCanvasRef.current;
    if (!canvas || !nextCanvas) return;
    const ctx = canvas.getContext("2d");
    const nextCtx = nextCanvas.getContext("2d");
    if (!ctx || !nextCtx) return;

    const CONTROL_CODES = new Set([
      "ArrowLeft",
      "ArrowRight",
      "ArrowDown",
      "ArrowUp",
      "Space",
    ]);

    const onKeyDown = (e: KeyboardEvent) => {
      if (CONTROL_CODES.has(e.code)) e.preventDefault();
      if (state !== "playing") return;
      switch (e.code) {
        case "ArrowLeft":
          if (!collide(current.shape, current.x - 1, current.y)) current.x--;
          break;
        case "ArrowRight":
          if (!collide(current.shape, current.x + 1, current.y)) current.x++;
          break;
        case "ArrowDown":
          softDrop();
          break;
        case "ArrowUp":
        case "KeyX":
          tryRotate();
          break;
        case "Space":
          hardDrop();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);

    const board: number[][] = Array.from({ length: ROWS }, () =>
      new Array(COLS).fill(0),
    );
    let score = 0;
    let lines = 0;
    let level = 1;
    let dropInterval = 1000;
    let dropAccum = 0;
    let state: GameState = "playing";
    let current: Piece;
    let next: Piece;

    function randomPiece(): Piece {
      const type = Math.floor(Math.random() * 8) + 1;
      const shape = PIECES[type]!.map((row) => [...row]);
      return {
        type,
        shape,
        x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2),
        y: 0,
      };
    }

    function collide(shape: number[][], ox: number, oy: number) {
      for (let r = 0; r < shape.length; r++) {
        for (let c = 0; c < shape[r].length; c++) {
          if (!shape[r][c]) continue;
          const nx = ox + c;
          const ny = oy + r;
          if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
          if (ny >= 0 && board[ny][nx]) return true;
        }
      }
      return false;
    }

    function rotateCW(shape: number[][]) {
      const rows = shape.length;
      const cols = shape[0].length;
      const result = Array.from({ length: cols }, () =>
        new Array(rows).fill(0),
      );
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) result[c][rows - 1 - r] = shape[r][c];
      return result;
    }

    function tryRotate() {
      const rotated = rotateCW(current.shape);
      const kicks = [0, -1, 1, -2, 2];
      for (const kick of kicks) {
        if (!collide(rotated, current.x + kick, current.y)) {
          current.shape = rotated;
          current.x += kick;
          return;
        }
      }
    }

    function merge() {
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            board[current.y + r][current.x + c] = current.shape[r][c];
    }

    function clearLines() {
      let cleared = 0;
      for (let r = ROWS - 1; r >= 0; r--) {
        if (board[r].every((v) => v !== 0)) {
          board.splice(r, 1);
          board.unshift(new Array(COLS).fill(0));
          cleared++;
          r++;
        }
      }
      if (cleared) {
        lines += cleared;
        score += (LINE_SCORES[cleared] || 0) * level;
        level = Math.floor(lines / 10) + 1;
        dropInterval = Math.max(100, 1000 - (level - 1) * 90);
      }
    }

    function ghostY() {
      let gy = current.y;
      while (!collide(current.shape, current.x, gy + 1)) gy++;
      return gy;
    }

    function hardDrop() {
      const gy = ghostY();
      score += (gy - current.y) * 2;
      current.y = gy;
      lockPiece();
    }

    function softDrop() {
      if (!collide(current.shape, current.x, current.y + 1)) {
        current.y++;
        score += 1;
      } else {
        lockPiece();
      }
    }

    function lockPiece() {
      merge();
      clearLines();
      spawn();
      drawNext();
    }

    function spawn() {
      current = next;
      next = randomPiece();
      if (collide(current.shape, current.x, current.y)) {
        state = "gameover";
      }
    }

    function drawBlock(
      context: CanvasRenderingContext2D,
      x: number,
      y: number,
      colorIndex: number,
      size: number,
      alpha?: number,
    ) {
      if (!colorIndex) return;
      context.globalAlpha = alpha ?? 1;
      context.fillStyle = COLORS[colorIndex]!;
      context.fillRect(x * size + 1, y * size + 1, size - 2, size - 2);
      context.fillStyle = "rgba(255,255,255,0.12)";
      context.fillRect(x * size + 1, y * size + 1, size - 2, 4);
      context.globalAlpha = 1;
    }

    function drawGrid() {
      ctx!.strokeStyle = "rgba(255,255,255,0.08)";
      ctx!.lineWidth = 0.5;
      for (let c = 1; c < COLS; c++) {
        ctx!.beginPath();
        ctx!.moveTo(c * BLOCK, 0);
        ctx!.lineTo(c * BLOCK, ROWS * BLOCK);
        ctx!.stroke();
      }
      for (let r = 1; r < ROWS; r++) {
        ctx!.beginPath();
        ctx!.moveTo(0, r * BLOCK);
        ctx!.lineTo(COLS * BLOCK, r * BLOCK);
        ctx!.stroke();
      }
    }

    function draw() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      drawGrid();

      for (let r = 0; r < ROWS; r++)
        for (let c = 0; c < COLS; c++)
          drawBlock(ctx!, c, r, board[r][c], BLOCK);

      const gy = ghostY();
      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          if (current.shape[r][c])
            drawBlock(
              ctx!,
              current.x + c,
              gy + r,
              current.shape[r][c],
              BLOCK,
              0.2,
            );

      for (let r = 0; r < current.shape.length; r++)
        for (let c = 0; c < current.shape[r].length; c++)
          drawBlock(
            ctx!,
            current.x + c,
            current.y + r,
            current.shape[r][c],
            BLOCK,
          );
    }

    function drawNext() {
      nextCtx!.clearRect(0, 0, nextCanvas!.width, nextCanvas!.height);
      const shape = next.shape;
      const offX = Math.floor((4 - shape[0].length) / 2);
      const offY = Math.floor((4 - shape.length) / 2);
      for (let r = 0; r < shape.length; r++)
        for (let c = 0; c < shape[r].length; c++)
          drawBlock(nextCtx!, offX + c, offY + r, shape[r][c], NEXT_BLOCK);
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
      const dt = lastTime === null ? 0 : ts - lastTime;
      lastTime = ts;
      if (state === "playing") {
        dropAccum += dt;
        if (dropAccum >= dropInterval) {
          dropAccum = 0;
          if (!collide(current.shape, current.x, current.y + 1)) {
            current.y++;
          } else {
            lockPiece();
          }
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

    next = randomPiece();
    spawn();
    drawNext();
    rafId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      controlsRef.current = null;
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        width={COLS * BLOCK}
        height={ROWS * BLOCK}
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          height: "100%",
          width: "auto",
        }}
      />
      <canvas
        ref={nextCanvasRef}
        width={120}
        height={120}
        style={{
          position: "absolute",
          top: 16,
          right: 16,
        }}
      />
    </>
  );
});

export default Tetris;

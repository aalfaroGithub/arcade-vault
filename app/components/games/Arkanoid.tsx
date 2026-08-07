"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { GameHandle, GameProps } from "./types";

const CONTROL_CODES = new Set(["ArrowLeft", "ArrowRight"]);

const CANVAS_W = 800;
const CANVAS_H = 600;

const PADDLE_SPEED = 400;
const BLOCK_COLS = 10;
const BLOCK_ROWS = 6;
const BLOCK_W = 64;
const BLOCK_H = 24;
const BLOCKS_ORIGIN_X = (CANVAS_W - BLOCK_COLS * BLOCK_W) / 2;
const BLOCKS_ORIGIN_Y = 80;
const BASE_BALL_VX = 200;
const BASE_BALL_VY = -300;

type BlockColor =
  "red" | "yellow" | "cyan" | "magenta" | "hotpink" | "green" | "gray";

interface Sprite {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
}

const SPRITES: {
  paddle: Sprite;
  ball: Sprite;
  blocks: Record<BlockColor, Sprite>;
} = {
  paddle: { sx: 32, sy: 112, sw: 162, sh: 14 },
  ball: { sx: 32, sy: 32, sw: 16, sh: 16 },
  blocks: {
    gray: { sx: 32, sy: 288, sw: 32, sh: 16 },
    red: { sx: 32, sy: 176, sw: 32, sh: 16 },
    yellow: { sx: 32, sy: 240, sw: 32, sh: 16 },
    cyan: { sx: 32, sy: 192, sw: 32, sh: 16 },
    magenta: { sx: 32, sy: 224, sw: 32, sh: 16 },
    hotpink: { sx: 32, sy: 256, sw: 32, sh: 16 },
    green: { sx: 32, sy: 208, sw: 32, sh: 16 },
  },
};

const EXPLOSION_FRAMES: Record<BlockColor, Sprite[]> = {
  red: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
  cyan: [
    { sx: 256, sy: 192, sw: 32, sh: 16 },
    { sx: 288, sy: 192, sw: 32, sh: 16 },
    { sx: 320, sy: 192, sw: 32, sh: 16 },
    { sx: 352, sy: 192, sw: 32, sh: 16 },
  ],
  green: [
    { sx: 256, sy: 208, sw: 32, sh: 16 },
    { sx: 288, sy: 208, sw: 32, sh: 16 },
    { sx: 320, sy: 208, sw: 32, sh: 16 },
    { sx: 352, sy: 208, sw: 32, sh: 16 },
  ],
  magenta: [
    { sx: 256, sy: 224, sw: 32, sh: 16 },
    { sx: 288, sy: 224, sw: 32, sh: 16 },
    { sx: 320, sy: 224, sw: 32, sh: 16 },
    { sx: 352, sy: 224, sw: 32, sh: 16 },
  ],
  yellow: [
    { sx: 256, sy: 240, sw: 32, sh: 16 },
    { sx: 288, sy: 240, sw: 32, sh: 16 },
    { sx: 320, sy: 240, sw: 32, sh: 16 },
    { sx: 352, sy: 240, sw: 32, sh: 16 },
  ],
  hotpink: [
    { sx: 256, sy: 256, sw: 32, sh: 16 },
    { sx: 288, sy: 256, sw: 32, sh: 16 },
    { sx: 320, sy: 256, sw: 32, sh: 16 },
    { sx: 352, sy: 256, sw: 32, sh: 16 },
  ],
  gray: [
    { sx: 256, sy: 176, sw: 32, sh: 16 },
    { sx: 288, sy: 176, sw: 32, sh: 16 },
    { sx: 320, sy: 176, sw: 32, sh: 16 },
    { sx: 352, sy: 176, sw: 32, sh: 16 },
  ],
};

const EXPLOSION_DURATION = 150;

interface LevelBlock {
  col: number;
  row: number;
  color: BlockColor;
}

interface Level {
  speed: number;
  blocks: LevelBlock[];
}

const LEVELS: Level[] = (() => {
  const rowColors1: BlockColor[] = [
    "red",
    "yellow",
    "cyan",
    "magenta",
    "hotpink",
    "green",
  ];
  const rowColors2: BlockColor[] = [
    "gray",
    "cyan",
    "hotpink",
    "yellow",
    "magenta",
    "green",
  ];
  const rowColors4: BlockColor[] = [
    "cyan",
    "magenta",
    "green",
    "yellow",
    "hotpink",
    "red",
  ];

  const l1: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      l1.push({ col, row, color: rowColors1[row] });

  const l2: LevelBlock[] = [];
  const pyStart = [4, 3, 2, 1, 0, 0];
  const pyEnd = [5, 6, 7, 8, 9, 9];
  for (let row = 0; row < 6; row++)
    for (let col = pyStart[row]; col <= pyEnd[row]; col++)
      l2.push({ col, row, color: rowColors2[row] });

  const l3: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if ((col + row) % 2 === 0)
        l3.push({ col, row, color: row < 3 ? "yellow" : "magenta" });

  const gaps4 = [
    [2, 5, 8],
    [0, 4, 7, 9],
    [1, 3, 6],
    [2, 5, 8, 9],
    [0, 4, 7],
    [1, 3, 6, 9],
  ];
  const l4: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++)
      if (!gaps4[row].includes(col))
        l4.push({ col, row, color: rowColors4[row] });

  const l5: LevelBlock[] = [];
  for (let row = 0; row < 6; row++)
    for (let col = 0; col < 10; col++) {
      const isFrame = col === 0 || col === 9 || row === 0 || row === 5;
      const isCross = col === 4 || row === 2;
      if (isFrame || isCross)
        l5.push({
          col,
          row,
          color: isCross && !isFrame ? "hotpink" : "cyan",
        });
    }

  return [
    { speed: 1.0, blocks: l1 },
    { speed: 1.1, blocks: l2 },
    { speed: 1.21, blocks: l3 },
    { speed: 1.33, blocks: l4 },
    { speed: 1.46, blocks: l5 },
  ];
})();

interface Paddle {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Ball {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
}

interface GameBlock {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  alive: boolean;
}

interface Explosion {
  x: number;
  y: number;
  w: number;
  h: number;
  color: BlockColor;
  elapsed: number;
}

const Arkanoid = forwardRef<GameHandle, GameProps>(function Arkanoid(
  { onStateChange, onGameOver },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
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
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let cancelled = false;
    let ssImg: HTMLCanvasElement | null = null;
    let ssLoaded = false;

    const bounceSound = new Audio("/games/arkanoid/sounds/ball-bounce.mp3");
    const breakSound = new Audio("/games/arkanoid/sounds/break-sound.mp3");

    const paddle: Paddle = { x: 0, y: 560, w: 162, h: 14 };
    const ball: Ball = { x: 0, y: 0, w: 16, h: 16, vx: 200, vy: -300 };
    let blocks: GameBlock[] = [];
    let explosions: Explosion[] = [];
    let lives = 3;
    let score = 0;
    let currentLevel = 1;
    let state: "loading" | "playing" | "gameover" = "loading";

    const keys = { ArrowLeft: false, ArrowRight: false };
    let paused = false;

    function initPaddle() {
      paddle.x = (CANVAS_W - paddle.w) / 2;
    }

    function initBall() {
      const speed = LEVELS[currentLevel - 1].speed;
      ball.x = paddle.x + (paddle.w - ball.w) / 2;
      ball.y = paddle.y - ball.h;
      ball.vx = BASE_BALL_VX * speed;
      ball.vy = BASE_BALL_VY * speed;
    }

    function loadLevel(n: number) {
      currentLevel = n;
      const level = LEVELS[n - 1];
      blocks = level.blocks.map((b) => ({
        x: BLOCKS_ORIGIN_X + b.col * BLOCK_W,
        y: BLOCKS_ORIGIN_Y + b.row * BLOCK_H,
        w: BLOCK_W,
        h: BLOCK_H,
        color: b.color,
        alive: true,
      }));
      explosions = [];
      initBall();
    }

    function collideAABB(block: GameBlock) {
      return (
        ball.x < block.x + block.w &&
        ball.x + ball.w > block.x &&
        ball.y < block.y + block.h &&
        ball.y + ball.h > block.y
      );
    }

    function drawSprite(
      name: "paddle" | "ball" | `block_${BlockColor}`,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      if (!ssLoaded || !ssImg) return;
      const sp = name.startsWith("block_")
        ? SPRITES.blocks[name.slice(6) as BlockColor]
        : SPRITES[name as "paddle" | "ball"];
      if (!sp) return;
      ctx!.drawImage(ssImg, sp.sx, sp.sy, sp.sw, sp.sh, x, y, w, h);
    }

    function drawFrame(
      frame: Sprite,
      x: number,
      y: number,
      w: number,
      h: number,
    ) {
      if (!ssLoaded || !ssImg) return;
      ctx!.drawImage(ssImg, frame.sx, frame.sy, frame.sw, frame.sh, x, y, w, h);
    }

    function update(dt: number) {
      if (state !== "playing") return;

      if (keys.ArrowLeft) paddle.x = Math.max(0, paddle.x - PADDLE_SPEED * dt);
      if (keys.ArrowRight)
        paddle.x = Math.min(CANVAS_W - paddle.w, paddle.x + PADDLE_SPEED * dt);

      ball.x += ball.vx * dt;
      ball.y += ball.vy * dt;

      if (ball.x <= 0) {
        ball.x = 0;
        ball.vx = Math.abs(ball.vx);
        (bounceSound.cloneNode() as HTMLAudioElement).play();
      }
      if (ball.x + ball.w >= CANVAS_W) {
        ball.x = CANVAS_W - ball.w;
        ball.vx = -Math.abs(ball.vx);
        (bounceSound.cloneNode() as HTMLAudioElement).play();
      }
      if (ball.y <= 0) {
        ball.y = 0;
        ball.vy = Math.abs(ball.vy);
        (bounceSound.cloneNode() as HTMLAudioElement).play();
      }

      if (
        ball.vy > 0 &&
        ball.x + ball.w > paddle.x &&
        ball.x < paddle.x + paddle.w &&
        ball.y + ball.h >= paddle.y &&
        ball.y + ball.h <= paddle.y + paddle.h + 8
      ) {
        ball.y = paddle.y - ball.h;
        ball.vy = -Math.abs(ball.vy);
        (bounceSound.cloneNode() as HTMLAudioElement).play();
      }

      for (const block of blocks) {
        if (!block.alive) continue;
        if (collideAABB(block)) {
          block.alive = false;
          explosions.push({
            x: block.x,
            y: block.y,
            w: block.w,
            h: block.h,
            color: block.color,
            elapsed: 0,
          });
          score += 10;
          ball.vy = -ball.vy;
          (breakSound.cloneNode() as HTMLAudioElement).play();
          if (blocks.every((b) => !b.alive)) {
            if (currentLevel < 5) loadLevel(currentLevel + 1);
            else state = "gameover";
          }
          break;
        }
      }

      for (const exp of explosions) exp.elapsed += dt * 1000;
      explosions = explosions.filter((exp) => exp.elapsed < EXPLOSION_DURATION);

      if (ball.y > CANVAS_H) {
        lives--;
        if (lives <= 0) {
          lives = 0;
          state = "gameover";
        } else {
          initBall();
        }
      }
    }

    function draw() {
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, CANVAS_W, CANVAS_H);

      if (state === "loading") {
        ctx!.fillStyle = "#fff";
        ctx!.font = "bold 24px monospace";
        ctx!.textAlign = "center";
        ctx!.textBaseline = "middle";
        ctx!.fillText("CARGANDO...", CANVAS_W / 2, CANVAS_H / 2);
        return;
      }

      for (const block of blocks) {
        if (block.alive)
          drawSprite(
            `block_${block.color}`,
            block.x,
            block.y,
            block.w,
            block.h,
          );
      }

      for (const exp of explosions) {
        const frameIndex = Math.min(
          Math.floor((exp.elapsed / EXPLOSION_DURATION) * 4),
          3,
        );
        drawFrame(
          EXPLOSION_FRAMES[exp.color][frameIndex],
          exp.x,
          exp.y,
          exp.w,
          exp.h,
        );
      }

      drawSprite("paddle", paddle.x, paddle.y, paddle.w, paddle.h);
      drawSprite("ball", ball.x, ball.y, ball.w, ball.h);
    }

    let lastReportedScore = -1;
    let lastReportedLives = -1;
    let lastReportedLevel = -1;
    let gameOverReported = false;

    function reportState() {
      if (state === "loading") return;
      if (
        score !== lastReportedScore ||
        lives !== lastReportedLives ||
        currentLevel !== lastReportedLevel
      ) {
        lastReportedScore = score;
        lastReportedLives = lives;
        lastReportedLevel = currentLevel;
        onStateChange({ score, lives, level: currentLevel });
      }
      if (state === "gameover" && !gameOverReported) {
        gameOverReported = true;
        onGameOver(score);
      }
    }

    let lastTime: number | null = null;
    let rafId = 0;

    function loop(ts: number) {
      const dt = lastTime === null ? 0 : (ts - lastTime) / 1000;
      lastTime = ts;
      if (!paused) update(dt);
      reportState();
      draw();
      rafId = requestAnimationFrame(loop);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (CONTROL_CODES.has(e.key)) e.preventDefault();
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") keys[e.key] = true;
      if (paused && state === "playing" && e.key >= "1" && e.key <= "5") {
        loadLevel(Number(e.key));
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") keys[e.key] = false;
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    controlsRef.current = {
      pause() {
        paused = true;
      },
      resume() {
        paused = false;
      },
      forceGameOver() {
        state = "gameover";
      },
    };

    draw();

    const rawImg = new Image();
    rawImg.onload = () => {
      if (cancelled) return;
      const oc = document.createElement("canvas");
      oc.width = rawImg.width;
      oc.height = rawImg.height;
      const octx = oc.getContext("2d");
      if (octx) {
        octx.drawImage(rawImg, 0, 0);
        ssImg = oc;
        ssLoaded = true;
      }
      initPaddle();
      loadLevel(1);
      state = "playing";
      rafId = requestAnimationFrame(loop);
    };
    rawImg.onerror = () => console.error("Failed to load spritesheet");
    rawImg.src = "/games/arkanoid/spritesheet-breakout.png";

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
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

export default Arkanoid;

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
const SCORE_PER_ADVANCE = 10;
const TURTLE_VISIBLE_MS = 3000;
const TURTLE_SUBMERGE_MS = 1500;
const GOAL_SCORE = 50;
const ROUND_COMPLETE_BONUS = 200;
const ROUND_TIME_STEP_S = 1;
const ROUND_TIME_MIN_S = 6;
// Columnas de inicio de cada boca (ancho GOAL_WIDTH), con huecos de 1 celda
// entre ellas y en los bordes: 16 columnas = 6 huecos de 1 + 5 bocas de 2.
const GOAL_STARTS = [1, 4, 7, 10, 13];

function roundTimeForLevel(level: number): number {
  return Math.max(
    ROUND_TIME_MIN_S,
    ROUND_TIME_INITIAL_S - (level - 1) * ROUND_TIME_STEP_S,
  );
}

// Fallbacks de zona = valores de la skin `clasico` en skins.ts
// (entities[5..8]); solo se usan si la paleta activa no los define.
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
  /** Reloj interno del ciclo de inmersión (solo tortugas); ver updateLanes(). */
  submergeT?: number;
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

function randRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number): number {
  return Math.floor(randRange(min, max + 1));
}

// Tiles entidades a lo largo de un carril virtual (más ancho que COLS para
// que siempre haya entidades entrando por fuera de pantalla), con huecos
// atravesables entre ellas.
function tileLane(
  build: () => Omit<Entity, "col">,
  gapMin: number,
  gapMax: number,
): Entity[] {
  const entities: Entity[] = [];
  let col = -randInt(2, 5);
  while (col < COLS + 5) {
    const spec = build();
    entities.push({ ...spec, col });
    col += spec.width + randInt(gapMin, gapMax);
  }
  return entities;
}

function buildRoadLaneEntities(): Entity[] {
  return tileLane(
    () => ({
      width: randInt(1, 3),
      type: Math.random() < 0.5 ? "car" : "truck",
    }),
    2,
    5,
  );
}

function buildRiverLogEntities(): Entity[] {
  return tileLane(() => ({ width: randInt(2, 4), type: "log" }), 1, 3);
}

function buildRiverTurtleEntities(): Entity[] {
  return tileLane(
    () => ({
      width: randInt(2, 3),
      type: "turtle",
      submerged: false,
      // Desfasado al azar dentro del ciclo para que no todas las tortugas
      // del carril se sumerjan a la vez.
      submergeT: randRange(0, TURTLE_VISIBLE_MS + TURTLE_SUBMERGE_MS),
    }),
    2,
    4,
  );
}

// Construye los 5 carriles de carretera (filas ROW_ROAD_TOP..ROW_ROAD_BOT) y
// los 6 carriles de río (filas ROW_RIVER_TOP..ROW_RIVER_BOT); cada nivel
// escala todas las velocidades ~SPEED_STEP_PER_LEVEL. Se llama al montar el
// juego y de nuevo en completeRound() (paso 5).
function buildLanes(level: number): Lane[] {
  const speedScale = 1 + (level - 1) * SPEED_STEP_PER_LEVEL;
  const lanes: Lane[] = [];

  const roadLaneCount = ROW_ROAD_BOT - ROW_ROAD_TOP + 1;
  for (let i = 0; i < roadLaneCount; i++) {
    lanes.push({
      row: ROW_ROAD_TOP + i,
      dir: i % 2 === 0 ? 1 : -1,
      speed: randRange(1.5, 4) * speedScale,
      entities: buildRoadLaneEntities(),
    });
  }

  const riverLaneCount = ROW_RIVER_BOT - ROW_RIVER_TOP + 1;
  for (let i = 0; i < riverLaneCount; i++) {
    // 2 de cada 6 carriles de río llevan tortugas, el resto troncos.
    const isTurtleLane = i % 3 === 1;
    lanes.push({
      row: ROW_RIVER_TOP + i,
      dir: i % 2 === 0 ? -1 : 1,
      speed: randRange(1, 3) * speedScale,
      entities: isTurtleLane
        ? buildRiverTurtleEntities()
        : buildRiverLogEntities(),
    });
  }

  return lanes;
}

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

    let level = 1;
    let lanes: Lane[] = buildLanes(level);
    const frog: Frog = {
      col: Math.floor(COLS / 2),
      row: ROW_START,
      animating: false,
      animT: 0,
      targetCol: Math.floor(COLS / 2),
      targetRow: ROW_START,
    };
    const goals: boolean[] = Array(GOAL_COUNT).fill(false);
    let score = 0;
    let lives = LIVES_INITIAL;
    let roundTimerMs = roundTimeForLevel(level) * 1000;
    let state: GameState = "playing";
    let pendingDir: Direction | null = null;
    let maxRowReached = frog.row;

    function zoneColorForRow(row: number): string {
      const zones = paletteRef.current.entities;
      if (row === ROW_GOALS) return zones[8] ?? ZONE_COLOR.goal;
      if (row >= ROW_RIVER_TOP && row <= ROW_RIVER_BOT)
        return zones[6] ?? ZONE_COLOR.river;
      if (row === ROW_SAFE_MID) return zones[7] ?? ZONE_COLOR.safe;
      if (row >= ROW_ROAD_TOP && row <= ROW_ROAD_BOT)
        return zones[5] ?? ZONE_COLOR.road;
      return zones[7] ?? ZONE_COLOR.safe; // ROW_START
    }

    // Glow neón: no-op exacto cuando glow === 0, así que `clasico`/`retro`
    // quedan idénticos a como se dibujaban antes. Se llama siempre dentro de
    // un save()/restore(), o se apaga con clearGlow() antes de los detalles.
    function applyGlow(color: string) {
      const glow = paletteRef.current.glow;
      if (glow > 0) {
        ctx!.shadowBlur = glow;
        ctx!.shadowColor = color;
      }
    }

    function clearGlow() {
      ctx!.shadowBlur = 0;
    }

    function drawCar(x: number, y: number, w: number) {
      const color = paletteRef.current.entities[0] ?? "#e53935";
      ctx!.fillStyle = color;
      applyGlow(color);
      ctx!.fillRect(x + 2, y + 8, w - 4, CELL - 20);
      clearGlow();
      ctx!.fillStyle = "#111";
      const wheelY = y + CELL - 10;
      ctx!.beginPath();
      ctx!.arc(x + 8, wheelY, 4, 0, Math.PI * 2);
      ctx!.arc(x + w - 8, wheelY, 4, 0, Math.PI * 2);
      ctx!.fill();
    }

    function drawTruck(x: number, y: number, w: number, dir: 1 | -1) {
      const color = paletteRef.current.entities[1] ?? "#757575";
      ctx!.fillStyle = color;
      applyGlow(color);
      ctx!.fillRect(x + 2, y + 6, w - 4, CELL - 16);
      clearGlow();
      const cabW = Math.min(CELL * 0.6, w * 0.35);
      const cabX = dir === 1 ? x + w - cabW - 2 : x + 2;
      ctx!.fillStyle = "#424242";
      ctx!.fillRect(cabX, y + 4, cabW, CELL - 12);
      ctx!.fillStyle = "#111";
      const wheelY = y + CELL - 8;
      ctx!.beginPath();
      for (let wx = x + 8; wx < x + w - 4; wx += 14) {
        ctx!.moveTo(wx + 3.5, wheelY);
        ctx!.arc(wx, wheelY, 3.5, 0, Math.PI * 2);
      }
      ctx!.fill();
    }

    function drawLog(x: number, y: number, w: number) {
      const color = paletteRef.current.entities[2] ?? "#8d6e63";
      ctx!.fillStyle = color;
      applyGlow(color);
      ctx!.fillRect(x + 1, y + 6, w - 2, CELL - 12);
      clearGlow();
      ctx!.strokeStyle = "rgba(0,0,0,0.35)";
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      for (let lx = x + 6; lx < x + w - 4; lx += 10) {
        ctx!.moveTo(lx, y + 8);
        ctx!.lineTo(lx, y + CELL - 8);
      }
      ctx!.stroke();
    }

    function drawTurtles(x: number, y: number, cellCount: number) {
      const color = paletteRef.current.entities[3] ?? "#43a047";
      ctx!.fillStyle = color;
      for (let i = 0; i < cellCount; i++) {
        const cx = x + i * CELL + CELL / 2;
        const cy = y + CELL / 2;
        applyGlow(color);
        ctx!.beginPath();
        ctx!.arc(cx, cy, CELL / 2 - 6, 0, Math.PI * 2);
        ctx!.fill();
        clearGlow();
        ctx!.strokeStyle = "rgba(0,0,0,0.25)";
        ctx!.beginPath();
        ctx!.arc(cx, cy, CELL / 2 - 10, 0, Math.PI * 2);
        ctx!.stroke();
      }
    }

    function drawEntity(entity: Entity, lane: Lane) {
      const x = entity.col * CELL;
      const y = lane.row * CELL;
      const w = entity.width * CELL;
      ctx!.save();
      if (entity.submerged) ctx!.globalAlpha = 0.3;
      switch (entity.type) {
        case "car":
          drawCar(x, y, w);
          break;
        case "truck":
          drawTruck(x, y, w, lane.dir);
          break;
        case "log":
          drawLog(x, y, w);
          break;
        case "turtle":
          drawTurtles(x, y, Math.round(entity.width));
          break;
      }
      ctx!.restore();
    }

    function drawFrog() {
      const t = frog.animating ? frog.animT / JUMP_MS : 0;
      const px = frog.animating
        ? frog.col + (frog.targetCol - frog.col) * t
        : frog.col;
      const py = frog.animating
        ? frog.row + (frog.targetRow - frog.row) * t
        : frog.row;
      const cx = px * CELL + CELL / 2;
      const cy = py * CELL + CELL / 2;
      const bodyColor = paletteRef.current.entities[4] ?? "#7cff5e";

      ctx!.save();
      applyGlow(bodyColor);
      if (frog.animating) {
        ctx!.strokeStyle = bodyColor;
        ctx!.lineWidth = 3;
        ctx!.lineCap = "round";
        const spread = 10;
        ctx!.beginPath();
        ctx!.moveTo(cx - spread, cy - spread);
        ctx!.lineTo(cx - CELL / 2 + 4, cy - CELL / 2 + 4);
        ctx!.moveTo(cx + spread, cy - spread);
        ctx!.lineTo(cx + CELL / 2 - 4, cy - CELL / 2 + 4);
        ctx!.moveTo(cx - spread, cy + spread);
        ctx!.lineTo(cx - CELL / 2 + 4, cy + CELL / 2 - 4);
        ctx!.moveTo(cx + spread, cy + spread);
        ctx!.lineTo(cx + CELL / 2 - 4, cy + CELL / 2 - 4);
        ctx!.stroke();
      }

      ctx!.fillStyle = bodyColor;
      ctx!.beginPath();
      ctx!.ellipse(cx, cy, 14, 12, 0, 0, Math.PI * 2);
      ctx!.fill();
      clearGlow();

      ctx!.fillStyle = "#ffffff";
      ctx!.beginPath();
      ctx!.arc(cx - 6, cy - 8, 4, 0, Math.PI * 2);
      ctx!.arc(cx + 6, cy - 8, 4, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.fillStyle = "#000000";
      ctx!.beginPath();
      ctx!.arc(cx - 6, cy - 8, 1.6, 0, Math.PI * 2);
      ctx!.arc(cx + 6, cy - 8, 1.6, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
    }

    // Franja translúcida sobre la fila de bocas: score/nivel/vidas-iconos y
    // debajo, la barra de tiempo de la ronda (verde → amarillo → rojo).
    function drawHud() {
      ctx!.fillStyle = "rgba(0,0,0,0.6)";
      ctx!.fillRect(0, 0, CANVAS_W, 14);

      ctx!.fillStyle = paletteRef.current.ink || "#ffffff";
      ctx!.font = "10px monospace";
      ctx!.textBaseline = "top";
      ctx!.textAlign = "left";
      ctx!.fillText(`${score}`, 4, 2);
      ctx!.textAlign = "center";
      ctx!.fillText(`NV ${level}`, CANVAS_W / 2, 2);

      const bodyColor = paletteRef.current.entities[4] ?? "#7cff5e";
      ctx!.fillStyle = bodyColor;
      for (let i = 0; i < lives; i++) {
        ctx!.beginPath();
        ctx!.arc(CANVAS_W - 8 - i * 10, 7, 3, 0, Math.PI * 2);
        ctx!.fill();
      }

      const totalMs = roundTimeForLevel(level) * 1000;
      const timeRatio = Math.max(0, Math.min(1, roundTimerMs / totalMs));
      const barY = 14;
      const barH = 4;
      ctx!.fillStyle = "rgba(255,255,255,0.15)";
      ctx!.fillRect(0, barY, CANVAS_W, barH);
      ctx!.fillStyle =
        timeRatio > 0.5 ? "#4caf50" : timeRatio > 0.2 ? "#ffeb3b" : "#f44336";
      ctx!.fillRect(0, barY, CANVAS_W * timeRatio, barH);
    }

    function draw() {
      for (let row = 0; row < ROWS; row++) {
        ctx!.fillStyle = zoneColorForRow(row);
        ctx!.fillRect(0, row * CELL, CANVAS_W, CELL);
      }

      // Bocas destino: marco dorado, silueta de rana si ocupada.
      for (let g = 0; g < GOAL_COUNT; g++) {
        const x = GOAL_STARTS[g] * CELL;
        ctx!.save();
        const frameColor = paletteRef.current.accent || "#d4af37";
        ctx!.strokeStyle = frameColor;
        applyGlow(frameColor);
        ctx!.lineWidth = 2;
        ctx!.strokeRect(
          x + 2,
          ROW_GOALS * CELL + 2,
          GOAL_WIDTH * CELL - 4,
          CELL - 4,
        );
        if (goals[g]) {
          const occupied = paletteRef.current.entities[4] ?? "#7cff5e";
          ctx!.fillStyle = occupied;
          applyGlow(occupied);
          ctx!.beginPath();
          ctx!.ellipse(
            x + GOAL_WIDTH * CELL - CELL,
            ROW_GOALS * CELL + CELL / 2,
            12,
            10,
            0,
            0,
            Math.PI * 2,
          );
          ctx!.fill();
        }
        ctx!.restore();
      }

      for (const lane of lanes) {
        for (const entity of lane.entities) {
          drawEntity(entity, lane);
        }
      }

      drawFrog();
      drawHud();
    }

    function updateLanes(dt: number) {
      for (const lane of lanes) {
        for (const entity of lane.entities) {
          // lane.speed está en px/frame (a 60fps, dt≈16ms); entity.col está en
          // columnas (1 columna = CELL px), así que la conversión pasa por CELL.
          entity.col += (lane.speed * lane.dir * dt) / 16 / CELL;
          if (lane.dir === 1 && entity.col > COLS) {
            entity.col = -entity.width;
          } else if (lane.dir === -1 && entity.col + entity.width < 0) {
            entity.col = COLS;
          }
          if (entity.type === "turtle") {
            entity.submergeT = (entity.submergeT ?? 0) + dt;
            const cycle = TURTLE_VISIBLE_MS + TURTLE_SUBMERGE_MS;
            entity.submerged = entity.submergeT % cycle >= TURTLE_VISIBLE_MS;
          }
        }
      }
    }

    function resetFrogPosition() {
      frog.col = Math.floor(COLS / 2);
      frog.row = ROW_START;
      frog.animating = false;
      frog.animT = 0;
      frog.targetCol = frog.col;
      frog.targetRow = frog.row;
      maxRowReached = frog.row;
      pendingDir = null;
    }

    // Prepara la siguiente ronda de la rana (tras ocupar una boca o morir con
    // vidas restantes): la devuelve al inicio y le da un temporizador fresco.
    function resetForNextDash() {
      resetFrogPosition();
      roundTimerMs = roundTimeForLevel(level) * 1000;
    }

    function killFrog() {
      lives = Math.max(0, lives - 1);
      if (lives === 0) {
        state = "gameover";
        return;
      }
      resetForNextDash();
    }

    function completeRound() {
      score += ROUND_COMPLETE_BONUS;
      goals.fill(false);
      level++;
      lanes = buildLanes(level);
      resetForNextDash();
    }

    // Rango [entity.col, entity.col + entity.width) sobre el que la rana
    // apoya o colisiona; se usa tanto para carretera como para río.
    function entityCoversFrog(entity: Entity): boolean {
      return frog.col >= entity.col && frog.col < entity.col + entity.width;
    }

    function checkRoadCollision(): boolean {
      const lane = lanes.find((l) => l.row === frog.row);
      if (!lane) return false;
      return lane.entities.some(entityCoversFrog);
    }

    // Entidad de río bajo la rana, o null si no hay soporte (agua libre o
    // tortuga sumergida).
    function getSupport(): { lane: Lane; entity: Entity } | null {
      const lane = lanes.find((l) => l.row === frog.row);
      if (!lane) return null;
      const entity = lane.entities.find(entityCoversFrog);
      if (!entity) return null;
      if (entity.type === "turtle" && entity.submerged) return null;
      return { lane, entity };
    }

    function checkGoal() {
      const goalIndex = GOAL_STARTS.findIndex(
        (start) => frog.col >= start && frog.col < start + GOAL_WIDTH,
      );
      if (goalIndex === -1 || goals[goalIndex]) {
        killFrog();
        return;
      }
      goals[goalIndex] = true;
      const timeBonus = Math.round((roundTimerMs / 1000) * 10);
      score += GOAL_SCORE + timeBonus;
      if (goals.every(Boolean)) {
        completeRound();
      } else {
        resetForNextDash();
      }
    }

    function resolveLanding() {
      if (frog.row < maxRowReached) {
        score += SCORE_PER_ADVANCE * (maxRowReached - frog.row);
        maxRowReached = frog.row;
      }
      if (frog.row === ROW_GOALS) {
        checkGoal();
      }
    }

    // Colisión con vehículo y caída al agua/salida de bordes del río; se
    // evalúa cada frame mientras la rana no está en el aire saltando.
    function updateHazards(dt: number) {
      if (frog.animating || state !== "playing") return;
      if (frog.row >= ROW_ROAD_TOP && frog.row <= ROW_ROAD_BOT) {
        if (checkRoadCollision()) killFrog();
        return;
      }
      if (frog.row >= ROW_RIVER_TOP && frog.row <= ROW_RIVER_BOT) {
        const support = getSupport();
        if (!support) {
          killFrog();
          return;
        }
        frog.col += (support.lane.speed * support.lane.dir * dt) / 16 / CELL;
        if (frog.col < 0 || frog.col > COLS - 1) {
          killFrog();
        }
      }
    }

    function updateFrog(dt: number) {
      if (frog.animating) {
        frog.animT += dt;
        if (frog.animT >= JUMP_MS) {
          frog.animating = false;
          frog.animT = 0;
          frog.col = frog.targetCol;
          frog.row = frog.targetRow;
          resolveLanding();
        }
        return;
      }
      if (!pendingDir) return;
      const delta = DIR_DELTA[pendingDir];
      pendingDir = null;
      const baseCol = Math.round(frog.col);
      const targetCol = Math.min(COLS - 1, Math.max(0, baseCol + delta.dc));
      const targetRow = Math.min(ROWS - 1, Math.max(0, frog.row + delta.dr));
      if (targetCol === baseCol && targetRow === frog.row) return;
      frog.animating = true;
      frog.animT = 0;
      frog.targetCol = targetCol;
      frog.targetRow = targetRow;
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
      if (state === "playing") {
        updateLanes(dt);
        updateFrog(dt);
        updateHazards(dt);
        if (state === "playing") {
          roundTimerMs -= dt;
          if (roundTimerMs <= 0) {
            roundTimerMs = 0;
            killFrog();
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

const DIR_DELTA: Record<Direction, { dc: number; dr: number }> = {
  up: { dc: 0, dr: -1 },
  down: { dc: 0, dr: 1 },
  left: { dc: -1, dr: 0 },
  right: { dc: 1, dr: 0 },
};

export default Frogger;

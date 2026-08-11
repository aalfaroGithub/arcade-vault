/**
 * Sistema de skins de Arcade Vault.
 *
 * Cada juego real declara una entrada en GAME_PALETTES por skin. La skin
 * "clasico" es la fuente de verdad visual: reproduce byte a byte los colores
 * que el juego ya tenía antes de que existiera este sistema. "neon" y "retro"
 * las añade el agente skin-designer (.claude/agents/skin-designer.md), un
 * juego a la vez.
 *
 * Los campos de GamePalette son genéricos a propósito — cada juego decide qué
 * significa cada uno dentro de su propio draw(). El comentario en cada
 * entrada de GAME_PALETTES documenta ese mapeo.
 */

export type SkinId = "clasico" | "neon" | "retro";

export const SKINS: { id: SkinId; label: string }[] = [
  { id: "clasico", label: "Clásico" },
  { id: "neon", label: "Neón" },
  { id: "retro", label: "Retro" },
];

export const DEFAULT_SKIN: SkinId = "clasico";

export interface GamePalette {
  bg: string;
  grid: string;
  ink: string;
  inkDim: string;
  accent: string;
  /** Colores indexados propios del juego (piezas, segmentos, etc.). */
  entities: string[];
  /** Tinte para sprites PNG; null = sprite original sin teñir. */
  tint: string | null;
  /** px de shadowBlur para el look neón; 0 = sin glow. */
  glow: number;
}

const NONE: GamePalette = {
  bg: "",
  grid: "",
  ink: "",
  inkDim: "",
  accent: "",
  entities: [],
  tint: null,
  glow: 0,
};

export const GAME_PALETTES: Record<
  string,
  Partial<Record<SkinId, GamePalette>>
> = {
  // entities[] indexado igual que la tabla PIECES de Tetris.tsx (índice 0 sin usar).
  // ink = highlight superior del bloque, grid = líneas de la grilla.
  caida: {
    clasico: {
      ...NONE,
      grid: "rgba(255,255,255,0.08)",
      ink: "rgba(255,255,255,0.12)",
      entities: [
        "",
        "#4dd0e1",
        "#ffd54f",
        "#ba68c8",
        "#81c784",
        "#e57373",
        "#90caf9",
        "#ffb74d",
        "#9e9e9e",
      ],
    },
  },
  // entities[0] = cabeza, entities[1] = cuerpo. ink = brillo de la cabeza.
  // Las frutas (fruits.png) nunca se tiñen en ninguna skin: son el elemento
  // identificable del juego.
  serpentina: {
    clasico: {
      ...NONE,
      bg: "#0a0a0a",
      grid: "rgba(255,255,255,0.06)",
      ink: "rgba(255,255,255,0.25)",
      entities: ["#7CFC7C", "#2FA82F"],
    },
    neon: {
      ...NONE,
      bg: "#04040a",
      grid: "rgba(0,245,255,0.10)",
      ink: "rgba(245,255,0,0.85)",
      inkDim: "rgba(0,245,255,0.55)",
      accent: "#f5ff00",
      entities: ["#00f5ff", "#ff006e"],
      glow: 10,
    },
    retro: {
      ...NONE,
      bg: "#0b0904",
      grid: "rgba(255,176,0,0.10)",
      ink: "rgba(255,209,102,0.6)",
      inkDim: "rgba(255,176,0,0.55)",
      accent: "#ffb000",
      entities: ["#ffb000", "#33ff66"],
      glow: 0,
    },
  },
  // ink = trazo de nave/asteroides/balas/partículas/HUD. inkDim = subtítulo
  // del overlay de fin de nivel/partida. accent = power-up 3x.
  // entities[0] = llama de propulsión.
  asteroids: {
    clasico: {
      ...NONE,
      bg: "#000",
      ink: "#fff",
      inkDim: "rgba(255,255,255,0.65)",
      accent: "#0ff",
      entities: ["rgba(255, 130, 0, 0.85)"],
    },
    neon: {
      ...NONE,
      bg: "#04040a",
      ink: "#00f5ff",
      inkDim: "rgba(0,245,255,0.6)",
      accent: "#ff006e",
      entities: ["#f5ff00"],
      glow: 12,
    },
    retro: {
      ...NONE,
      bg: "#0b0904",
      ink: "#ffb000",
      inkDim: "rgba(255,176,0,0.55)",
      accent: "#33ff66",
      entities: ["#ffd166"],
      glow: 0,
    },
  },
  // ink = texto "CARGANDO...". tint = tinte del spritesheet (null = original).
  // El tinte se aplica con "source-atop" sobre todo el spritesheet, así que un
  // color semitransparente conserva el sombreado y la variedad de ladrillos;
  // uno opaco los aplanaría a una sola silueta.
  // glow solo afecta a pala, bola y explosiones (los ladrillos no llevan
  // sombra para no pagar ~60 drawImage con shadowBlur por frame).
  "bloque-buster": {
    clasico: {
      ...NONE,
      bg: "#000",
      ink: "#fff",
      tint: null,
    },
    neon: {
      ...NONE,
      bg: "#04040a",
      ink: "#00f5ff",
      inkDim: "rgba(0,245,255,0.6)",
      accent: "#ff006e",
      tint: "rgba(0,245,255,0.6)",
      glow: 12,
    },
    retro: {
      ...NONE,
      bg: "#0b0904",
      ink: "#ffb000",
      inkDim: "rgba(255,176,0,0.55)",
      accent: "#33ff66",
      tint: "rgba(255,176,0,0.72)",
      glow: 0,
    },
  },
};

export function getPalette(gameId: string, skin: SkinId): GamePalette {
  const byGame = GAME_PALETTES[gameId];
  return byGame?.[skin] ?? byGame?.clasico ?? NONE;
}

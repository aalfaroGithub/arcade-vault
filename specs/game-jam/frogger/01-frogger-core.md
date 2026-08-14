# SPEC — Frogger: integración core del juego

> **Estado:** Approved
> **Depende de:** 06-leaderboard-supabase
> **Fecha:** 2026-08-13
> **Objetivo:** Diseñar e implementar `app/components/games/Frogger.tsx`, un juego real de Frogger (canvas puro, construido desde cero) para el id de catálogo existente `ranaria`, registrado en `REAL_GAMES` y con leaderboard real en Supabase igual que Asteroids/Tetris/Arkanoid/Snake.

---

## Nota de revisión

Este spec reemplaza una versión previa que definía un contrato de integración
propio (props `paused`/`onScoreChange`/`onLivesChange`/`onLevelChange`, ruta
dedicada `app/games/frogger/play/page.tsx`, id de catálogo nuevo `frogger`).
Esa versión no encajaba con la arquitectura real de Arcade Vault: el chasis
único `GamePlayer.tsx`, el registro `REAL_GAMES`, el contrato compartido
`GameProps`/`GameHandle` (`app/components/games/types.ts`) y la ruta genérica
`/game/[id]/play`. Esta versión reescribe el spec contra esa arquitectura,
siguiendo el precedente más reciente (`specs/09-snake-real.md`).

También corrige el mapeo de catálogo: `ranaria` ya es el placeholder de
Frogger en `app/data/games.ts` (categoría ARCADE, cover `cover-rana`, color
`green`) — no se crea un id `frogger` nuevo, se reutiliza `ranaria` con el
mismo criterio que `caida`→Tetris, `bloque-buster`→Arkanoid y
`serpentina`→Snake.

---

## Scope

**In:**

- Componente `app/components/games/Frogger.tsx` (client component): juego de Frogger diseñado desde cero (sin `game.js` de referencia — no existe carpeta en `references/started-games/` para este juego), sobre un único `<canvas>` 640×560 (grilla de 16×14 celdas de 40px), siguiendo el patrón obligatorio ya establecido (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`, `paletteRef` sincronizado en cada render y leído dentro de `draw()`).
- Contrato compartido sin cambios: `forwardRef<GameHandle, GameProps>` — props `onStateChange({score, lives, level})`, `onGameOver(finalScore)`, `palette`; ref imperativa `pause()`/`resume()`/`forceGameOver()`. No existe una prop `paused` — la pausa se controla exclusivamente vía la ref, exactamente igual que Asteroids/Tetris/Arkanoid/Snake.
- Mapa vertical de 14 filas (0 = arriba) dividido en zonas fijas: fila 0 bocas destino, filas 1–6 río (6 carriles), fila 7 zona segura intermedia, filas 8–12 carretera (5 carriles), fila 13 zona de inicio.
- Entidades de carretera: coches y camiones de 1–3 celdas, velocidad y sentido por carril, movimiento horizontal en loop continuo (reingresan por el lado opuesto al salir); colisión con la rana es letal.
- Entidades de río: troncos (2–4 celdas) y grupos de tortugas (2–3) por carril, movimiento horizontal en loop continuo. La rana solo sobrevive sobre un tronco o tortugas visibles; cae al agua si no hay soporte. Las tortugas alternan visible (3s) / sumergida (1.5s); sumergidas no dan soporte.
- Movimiento de la rana: saltos discretos de 1 celda (40px) en 4 direcciones, con animación de 120ms por salto (mismo patrón de acumulador de tiempo que introdujo Snake para movimiento por grilla sobre un loop de `requestAnimationFrame` continuo). La rana no sale de los bordes laterales.
- Meta: 5 bocas en la fila 0, cada una ocupa 2 columnas; una boca ocupada no se puede reusar en la misma ronda — llegar a una boca ocupada es muerte. Al llenar las 5 bocas se completa la ronda.
- Condiciones de muerte: colisión con vehículo, caída al agua (sin soporte), tortuga bajo la rana se sumerge, salida por los bordes del río, o agotar el temporizador de ronda.
- Vidas: arranca con 3 (mismo patrón que Arkanoid/Space Invaders/Asteroids). Cada muerte resta 1 vida; si `lives === 0` se llama `onGameOver(score)` una sola vez, igual que el resto del catálogo. Si quedan vidas, la rana vuelve a la fila de inicio y se reinicia el temporizador de ronda (no la partida completa).
- Puntuación: +10 por cada celda avanzada hacia arriba por primera vez en la ronda; +50 al ocupar una boca; +200 al completar la ronda; +bonus de tiempo (`tiempo_restante × 10`) al ocupar una boca.
- Temporizador de ronda: 15s iniciales, se acorta con cada nivel (igual criterio que Snake acorta su `tickMs` por nivel); es información interna del juego, no forma parte de `GameProps` — se muestra únicamente en el HUD interno del canvas (no hay slot para "tiempo restante" en el HUD de React del chasis).
- Nivel: sube al completar cada ronda (5 bocas llenas); cada nivel incrementa velocidades de entidades ~15% y acorta el temporizador de ronda. Da uso real al campo `level` del HUD compartido.
- HUD interno del canvas: score (arriba-izquierda), vidas como iconos de rana (arriba-derecha), nivel (arriba-centro), barra de tiempo de ronda (fila 0) — mismo patrón de doble HUD que el resto de juegos reales (React más el HUD dibujado en canvas).
- Registro `app/data/realGames.ts`: nueva entrada `ranaria: { component: Frogger }`.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `ranaria` para describir el juego real; `id`, `cover: "cover-rana"`, `cat: "ARCADE"`, `color: "green"`, `best`, `plays` no cambian.
- Tabla `games` en Supabase: nueva fila `id: "ranaria"` (mismo patrón SQL que specs 06/07/08/09), insertada antes de cualquier `insertScore('ranaria', ...)`.
- `/game/ranaria` (detalle, ruta genérica existente): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase.
- Entrada inicial en `app/data/skins.ts` (`GAME_PALETTES.ranaria.clasico`) con los colores base necesarios para que `draw()` no dependa de strings vacíos (`NONE`) antes de que corra `skin-designer`; `neon`/`retro` quedan fuera de este spec — los añade `skin-designer` en la fase siguiente del flujo `/spec-impl-game`.

**Fuera de alcance:**

- Sprites bitmap externos — todos los elementos se dibujan con primitivas canvas (rectángulos, arcos, formas compuestas) con colores temáticos leídos de `paletteRef`; no se carga ninguna imagen.
- Controles táctiles o mobile (no se agrega entrada en `app/data/touchControls.ts`; sin ella `TouchControls` no se renderiza para `ranaria`, comportamiento ya soportado por el chasis).
- Animaciones de muerte elaboradas (explosiones, partículas).
- Power-ups especiales (mosca en la boca destino, cocodrilo disfrazado de tronco).
- Skins `neon`/`retro` (las añade `skin-designer` después de este spec, según el flujo de `/spec-impl-game`).
- Ruta o página propia (`app/games/frogger/play/page.tsx`) — se usa la ruta genérica `/game/[id]/play` vía `GamePlayer.tsx` + `REAL_GAMES`, sin cambios a `GamePlayer.tsx`.
- Modal de fin de partida propio — lo provee `GamePlayer.tsx` (nombre desde `av_user`/`localStorage`, inserción vía `insertScore`), sin cambios a ese componente.
- Supabase Auth y RLS — `user_id` se almacena como `null`.
- Realtime en el leaderboard.
- Componente genérico `CanvasGame` (YAGNI).

---

## Data model

Reusa el contrato compartido existente, sin cambios:

```ts
// app/components/games/types.ts (sin cambios)
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
  palette: GamePalette;
}
```

```ts
// app/components/games/Frogger.tsx
import type { GameHandle, GameProps } from "./types";

const Frogger = forwardRef<GameHandle, GameProps>(function Frogger(
  { onStateChange, onGameOver, palette },
  ref,
) {
  // useEffect único: grid 16x14 (celda 40px) / lanes (carretera+río) / frog
  // ({col,row,animating,animT,targetCol,targetRow}) / goals (5 bocas, ocupadas[])
  // / score / lives / level / roundTimer / state ("playing"|"gameover")
  // reportState(): onStateChange({ score, lives, level }); onGameOver(score) una
  // sola vez al llegar lives === 0.
});
```

```ts
// Constantes de grilla (dentro de Frogger.tsx)
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
```

```ts
// Tipos locales (no exportados)
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
```

```ts
// app/data/realGames.ts — agrega una entrada
import Frogger from "../components/games/Frogger";

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { component: Asteroids },
  caida: { component: Tetris },
  "bloque-buster": { component: Arkanoid },
  serpentina: { component: Snake },
  ranaria: { component: Frogger },
};
```

```ts
// app/data/games.ts, entrada ranaria (solo cambian short/long, resto igual)
{
  id: "ranaria",
  title: "RANARIA",
  short: "...",   // texto real pendiente de redacción en la implementación
  long: "...",    // texto real pendiente de redacción en la implementación
  cat: "ARCADE",
  cover: "cover-rana",
  color: "green",
  best: 18900,
  plays: "6.4K",
}
```

```ts
// app/data/skins.ts — nueva entrada, solo skin "clasico" en este spec
ranaria: {
  clasico: {
    ...NONE,
    bg: "#050505",         // pendiente de ajuste fino en la implementación
    grid: "rgba(255,255,255,0.06)",
    ink: "#ffffff",
    inkDim: "rgba(255,255,255,0.5)",
    accent: "#8bc34a",
    // entities: [carretera coche, carretera camión, río tronco, río tortuga, rana]
    entities: ["#e53935", "#757575", "#8d6e63", "#43a047", "#7cff5e"],
    tint: null,
    glow: 0,
  },
},
```

Fila nueva en Supabase `games` (mismo esquema de `specs/06-leaderboard-supabase.md`, sin cambios de tabla):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'ranaria',
  'RANARIA',
  '...',   -- mismo short que en games.ts
  '...',   -- mismo long que en games.ts
  'ARCADE',
  'cover-rana',
  'green',
  18900,
  '6.4K'
);
```

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

---

## Implementation plan

1. **Crear `app/components/games/Frogger.tsx`** con las constantes de grilla/filas, tipos locales y el esqueleto `forwardRef<GameHandle, GameProps>` — estado mutable (`lanes`, `frog`, `goals`, `score`, `lives`, `level`, `roundTimer`, `state`) dentro de un único `useEffect`, `paletteRef` sincronizado en cada render, canvas 640×560 dibujado con `height: 100%; width: auto` centrado (mismo estilo que Arkanoid/Snake). Aún sin wiring — componente autocontenido, no montado en ningún lado todavía.
   Verificación: el canvas se ve al montar manualmente en una página temporal (o directamente en el paso 7), con las tres zonas ya visualmente diferenciadas usando `paletteRef`.

2. **`buildLanes(level: number): Lane[]`** — carriles de carretera (filas 8–12) con coches/camiones de 1–3 celdas, huecos atravesables, velocidades 1.5–4 px/frame escaladas por `1 + level * SPEED_STEP_PER_LEVEL`; carriles de río (filas 1–6) con troncos de 2–4 celdas (huecos ≥1 celda) y grupos de tortugas de 2–3 con ciclo de inmersión 3s visible / 1.5s sumergida; sentidos alternos por carril; reintroducción por el lado opuesto al salir del borde.
   Verificación: log manual de `lanes` — cada carril con ≥2 entidades y huecos visibles.

3. **Input y movimiento de la rana** — listener `keydown` en `window` (`ArrowUp/Down/Left/Right`, `preventDefault()`, cleanup en el `return`); si la rana no está animando y hay dirección pendiente, inicia salto (`animating = true`, `animT = 0`, calcula `targetCol/targetRow` con clamp a los bordes laterales); si está animando, acumula `animT` hasta `JUMP_MS` y completa el salto, resolviendo la celda destino (colisión/soporte/meta/puntuación de `+10` por avance nuevo).
   Verificación manual: la rana salta exactamente una celda por pulsación, con animación visible, sin salir de los bordes.

4. **Colisiones y soporte** — `checkRoadCollision(frog, lanes)`, `getSupport(frog, lanes)` (null si la entidad es tortuga `submerged`), `checkGoal(frog, goals)` (boca libre → ocupa + puntúa; boca ocupada o columna sin boca → muerte). Cuando la rana está en el río y no animando, se desplaza horizontalmente junto con la entidad que la soporta.
   Verificación manual: morir por vehículo, morir por caída al agua, morir por tortuga sumergiéndose, sobrevivir sobre tronco/tortuga visible arrastrándose con la corriente.

5. **Temporizador de ronda y `killFrog()`/`completeRound()`** — decremento de `roundTimer` cada frame; en 0, muerte por tiempo. `killFrog()`: `lives--`; si `lives === 0`, `state = "gameover"`; si no, la rana vuelve a la fila de inicio y se reinicia el temporizador. `completeRound()`: vacía bocas ocupadas, repone la rana en la fila de inicio, `level++`, reconstruye `lanes` con `buildLanes(level)`, reinicia el temporizador con el valor acortado del nuevo nivel.
   Verificación manual: al agotar el tiempo la rana muere; al llenar las 5 bocas la ronda avanza, el nivel sube y las entidades se ven más rápidas.

6. **`draw()`** leyendo `paletteRef.current` — fondos por zona (carretera/río/zonas seguras/bocas destino), entidades de carretera y río con las formas descritas en el spec original (coches con ruedas, camiones con cabina, troncos con textura, tortugas visibles/sumergidas), rana (elipse con ojos, patas extendidas durante el salto), bocas (marco dorado, silueta si ocupada), y HUD interno (score, nivel, vidas-iconos, barra de tiempo).
   Verificación manual: todas las zonas y entidades se distinguen visualmente; el HUD interno coincide con el estado real.

7. **`reportState()`** — diffing manual de `score`/`lives`/`level` contra los últimos reportados vía `onStateChange`; `onGameOver(score)` se dispara una sola vez al transicionar a `lives === 0`.

8. **Exponer `GameHandle`** vía `forwardRef` + `useImperativeHandle` (`pause`/`resume` congelan/reanudan el `requestAnimationFrame` — `update()` se salta por completo mientras está en pausa pero el canvas no se reescala; `forceGameOver()` fuerza `state = "gameover"`), siguiendo el patrón `controlsRef` de Asteroids/Tetris/Arkanoid/Snake.

9. **Agregar `Frogger` a `app/data/realGames.ts`** bajo la clave `"ranaria"`.
   Verificación manual: `GamePlayer` (sin cambios propios) ya renderiza el canvas real de Frogger al entrar a `/game/ranaria/play`, con HUD, PAUSA/FIN y modal de fin de partida funcionando igual que los otros juegos reales.

10. **Agregar entrada `ranaria.clasico` en `app/data/skins.ts`** con los colores base del data model, para que `draw()` no dependa de `NONE` (strings vacíos).

11. **Actualizar `app/data/games.ts`**: reescribir `short`/`long` de la entrada `ranaria` para reflejar el juego real (carretera, río, bocas destino, niveles).

12. **Escribir y aplicar la migración SQL** (`insert into games ...` para `id: 'ranaria'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.

13. **Prueba manual completa** en `/game/ranaria/play`: saltar en las 4 direcciones, cruzar la carretera esquivando vehículos, cruzar el río sobre troncos/tortugas (incluida una muerte por tortuga sumergida), llegar a una boca libre y a una ya ocupada, completar las 5 bocas y ver subir el nivel y acelerarse el tráfico, agotar el temporizador de ronda, perder las 3 vidas y ver el modal de fin de partida, pausar/reanudar con el botón del chasis, "FIN", guardar puntuación y confirmar que aparece en `/game/ranaria` y en el tab RANARIA del Salón de la Fama; confirmar que el resto del catálogo no sufrió regresión.

14. **Verificación final** — `npm run build` termina sin errores de TypeScript. Ninguna ruta existente devuelve 500.

---

## Acceptance criteria

- [ ] `/game/ranaria/play` monta el canvas real de Frogger (640×560, grilla 16×14) en vez de la simulación CSS (`.game-arena`).
- [ ] El canvas se renderiza con las cuatro zonas visualmente diferenciadas (bocas destino, río, zona segura, carretera), usando colores de `paletteRef`.
- [ ] La rana aparece centrada en la fila de inicio al cargar la partida.
- [ ] La rana salta exactamente una celda (40px) por pulsación de tecla de dirección, con animación de 120ms.
- [ ] La rana no puede salir por los bordes laterales.
- [ ] Los coches y camiones se mueven horizontalmente en loop por sus carriles, reintroduciéndose por el lado opuesto al salir.
- [ ] Los troncos y tortugas se mueven horizontalmente en loop por sus carriles.
- [ ] Las tortugas alternan entre visible y sumergida con el ciclo definido (3s / 1.5s).
- [ ] La rana muere al ser alcanzada por un vehículo de carretera.
- [ ] La rana muere al caer al agua (sin tronco ni tortuga visible de soporte).
- [ ] La rana muere cuando la tortuga que la soporta se sumerge.
- [ ] La rana muere al agotar el temporizador de ronda.
- [ ] Al morir con vidas restantes, la rana vuelve a la fila de inicio y se reinicia el temporizador de ronda (la partida sigue).
- [ ] Al llegar a una boca libre, la boca queda marcada y se suma el bonus de puntuación (`+50` más `tiempo_restante × 10`).
- [ ] Al llegar a una boca ya ocupada, la rana muere.
- [ ] Al completar las 5 bocas, la ronda termina, se suman `+200` puntos y comienza la siguiente con `level` incrementado.
- [ ] La velocidad de las entidades aumenta con cada nivel (~15%).
- [ ] El temporizador de ronda disminuye con cada nivel.
- [ ] El HUD interno del canvas (score, nivel, vidas-iconos, barra de tiempo) se dibuja correctamente.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real (`onStateChange`).
- [ ] Al llegar a `lives === 0`, `onGameOver(score)` se dispara una sola vez y abre el modal existente de `GamePlayer`.
- [ ] Pulsar "PAUSA" congela el juego (nada se mueve, el temporizador de ronda no baja); "REANUDAR" lo retoma exactamente donde quedó.
- [ ] Pulsar "FIN" fuerza game over inmediato y abre el modal existente con el score real acumulado.
- [ ] Guardar la puntuación en el modal inserta una fila en Supabase `scores` (`game_id: "ranaria"`, `name`, `score`).
- [ ] Las teclas de flecha no hacen scroll de la página mientras se juega Frogger.
- [ ] `/game/ranaria` muestra `short`/`long` actualizados describiendo el juego real, leaderboard real desde Supabase, y "Partidas"/"Mejor global" calculados desde `scores` (0 en ambos si la tabla está vacía para ese id).
- [ ] El tab RANARIA de `/hall-of-fame` muestra podio + tabla con datos reales de Supabase, con el mismo manejo de <3 filas que ya tienen los demás juegos reales.
- [ ] Los 3 juegos placeholder restantes (`gloton`, `invasores`, `duelo-pixel`) siguen mostrando la simulación visual sin cambios, sin regresión.
- [ ] `/game/asteroids/play`, `/game/caida/play`, `/game/bloque-buster/play` y `/game/serpentina/play` siguen funcionando exactamente igual que antes.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/ranaria`, `/game/ranaria/play` y `/hall-of-fame`.
- [ ] `npm run build` completa sin errores de TypeScript.
- [ ] Ninguna ruta existente devuelve 500.

---

## Decisions

- **Sí: reutilizar el id de catálogo existente `ranaria`** (ARCADE, `cover-rana`, verde) en vez de crear un id nuevo `frogger`. Ya calza en categoría, portada y color; mismo criterio que `caida`→Tetris, `bloque-buster`→Arkanoid y `serpentina`→Snake. Corrige la versión previa de este spec, que insertaba una fila `frogger` inexistente en el catálogo.
- **Sí: usar el contrato compartido `GameProps`/`GameHandle`** (`app/components/games/types.ts`) sin extenderlo — no se agrega una prop `paused` ni callbacks `onScoreChange`/`onLivesChange`/`onLevelChange` sueltos. La pausa se controla vía la ref (`pause()`/`resume()`), y los tres valores (`score`/`lives`/`level`) viajan juntos en `onStateChange`, igual que todos los juegos reales existentes. Corrige la versión previa, que definía un contrato de props propio incompatible con `GamePlayer.tsx`.
- **Sí: ruta genérica `/game/[id]/play` vía `GamePlayer.tsx` + `REAL_GAMES`**, sin página ni carpeta propia (`app/games/frogger/play/`). Mismo criterio que los 4 juegos reales existentes; `GamePlayer.tsx` ya generaliza HUD, pausa, modal de fin de partida y guardado de score. Corrige la versión previa, que creaba una play-page dedicada.
- **Sí: Primitivas canvas sin sprites bitmap** — coches, camiones, troncos, tortugas y rana se dibujan con formas geométricas canvas y colores leídos de `paletteRef`. Razón: no existen assets de Frogger en el repositorio; dibujar por código elimina dependencias de carga de imágenes y permite que las skins ajusten el visual sin archivos externos.
- **Sí: cuadrícula discreta de 40px con animación de salto de 120ms** — el movimiento de la rana es celda a celda, no continuo. Razón: mecánica canónica de Frogger; simplifica la detección de colisiones y el soporte en el río al comparar filas/columnas enteras.
- **Sí: 3 vidas reales** — arranca en 3, cada muerte resta una y se reporta vía `onStateChange`; `onGameOver` se dispara solo en `lives === 0`. Razón: fiel a la mecánica clásica; coherente con Arkanoid/Asteroids/Space Invaders, a diferencia de Snake/Tetris que reportan `lives` booleana por no tener sistema de vidas propio.
- **Sí: tortugas con ciclo de inmersión** — alternan entre soporte y peligro con temporizador independiente por grupo. Razón: mecánica diferenciadora de Frogger respecto a un río de solo troncos.
- **Sí: temporizador de ronda** (15s iniciales, decrecientes por nivel) — información interna del canvas, sin slot propio en `GameProps`. Razón: mecánica original de Frogger; el contrato compartido no necesita un campo específico de este juego, igual que Tetris no expone su "siguiente pieza" fuera del canvas.
- **Sí: 5 bocas destino** que deben llenarse para completar la ronda. Razón: mecánica original que da estructura de objetivo claro por ronda.
- **Sí: canvas 640×560px (16×14 celdas de 40px)** — mapa vertical, mismo tratamiento de centrado (`height: 100%; width: auto`) que el resto de canvases del catálogo aunque el aspect ratio difiera del 4:3 de Snake/Arkanoid.
- **Sí: `Frogger` a `REAL_GAMES` bajo la clave `ranaria`** — el registro es el único punto de bifurcación real/placeholder; no se compara el id a mano en ningún componente.
- **Sí: entrada `clasico` en `app/data/skins.ts` como parte de este spec** — sin ella, `getPalette` cae a `NONE` (strings vacíos) y `draw()` queda visualmente roto hasta que corra `skin-designer`. `neon`/`retro` sí quedan para la fase de `skin-designer` del flujo `/spec-impl-game`.
- **No: movimiento continuo (interpolado)** — la rana no se desliza; salta de celda en celda. Razón: la interpolación continua requeriría colisiones AABB en espacio continuo, aumentando la complejidad sin añadir diversión.
- **No: cocodrilo disfrazado de tronco ni mosca bonus en bocas** — capas de dificultad y recompensa independientes de la mecánica base; van en un spec secundario.
- **No: componente genérico `CanvasGame`** — cada juego tiene su componente propio (YAGNI).
- **No: RLS en este spec** — las tablas quedan abiertas (INSERT y SELECT públicos), igual que el resto del catálogo.
- **No: Realtime en leaderboards** — los scores se ven al recargar.
- **No: controles táctiles/móviles en este spec** — se cubren, si se necesitan, en un spec de `mobile-porter` posterior (el flujo `/spec-impl-game` ya lo encadena tras `skin-designer`).
- **No: tocar `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx`** más allá de lo ya existente — el registro `REAL_GAMES` ya generaliza la integración de un juego nuevo sin tocar esos archivos.

---

## Risks

| Risk                                                                                                                                                                                | Mitigación                                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('ranaria', ...)` falla silenciosamente (`.catch(() => {})`) si la fila `games` no existe todavía                                                          | El plan aplica la migración (paso 12) antes de la prueba manual completa (paso 13), que es el primer momento en que se guarda un score real.                  |
| `draw()` depende de `paletteRef.current` desde el primer commit, pero solo se agrega la skin `clasico` (no `neon`/`retro`)                                                          | Documentado explícitamente en Decisions; `neon`/`retro` son responsabilidad de la fase `skin-designer` del flujo `/spec-impl-game`, no de este spec.          |
| Mecánica de soporte en río (rana arrastrada por tronco/tortuga mientras no anima) es nueva en el catálogo — ningún juego real existente combina grilla discreta + arrastre continuo | Se aísla en `getSupport()`/el bloque "rana en el río, no animando" del `update()`; se verifica manualmente en el paso 4/13 antes de dar el spec por completo. |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de Frogger con el mismo nombre colisionan                                                                                      | No es un bloqueante (el resto de juegos reales ya lo tiene); no se corrige en este spec.                                                                      |

---

## What is **not** in this spec

- Sprites bitmap / assets externos.
- Controles táctiles/móviles.
- Animaciones de muerte elaboradas (explosiones, partículas).
- Power-ups (mosca bonus, cocodrilo disfrazado).
- Skins `neon`/`retro` de Frogger.
- Ruta o página dedicada fuera de `/game/[id]/play`.
- Auth real de Supabase / RLS endurecido.
- Realtime en el leaderboard.
- Cambios a `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados (no hay test runner configurado).

Cada uno de estos, si se necesita, va en su propio spec.

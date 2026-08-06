# SPEC 07 — Tetris real y registro genérico de juegos reales

> **Status:** Approved
> **Depends on:** 05-asteroids-real, 06-leaderboard-supabase
> **Date:** 2026-08-06
> **Objective:** Portar `references/started-games/03-tetris/game.js` a un componente React (`Tetris.tsx`) para el catálogo id `caida`, introduciendo de paso el registro genérico `app/data/realGames.ts` que reemplaza las 7 bifurcaciones `game.id === "asteroids"` en `GamePlayer.tsx` y la de `app/hall-of-fame/page.tsx`, y conectando su leaderboard a Supabase igual que Asteroids.

## Scope

**In:**

- Componente `app/components/games/Tetris.tsx` (client component): puerto completo de `references/started-games/03-tetris/game.js` sobre dos `<canvas>` — tablero 300×600 y preview de siguiente pieza 120×120 — siguiendo el patrón obligatorio de Asteroids (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`).
- Tipo compartido `app/components/games/types.ts` con `GameHandle`/`GameProps` genéricos; `Asteroids.tsx` se adapta para importarlos en vez de declarar `AsteroidsHandle`/`AsteroidsProps` propios.
- Registro genérico `app/data/realGames.ts` (`REAL_GAMES: Record<string, RealGameEntry>`) con entradas para `asteroids` y `caida`.
- `GamePlayer.tsx`: las 7 bifurcaciones `game.id === "asteroids"` (HUD, ticker simulado, `togglePause`, `endGame`, `restart`, `saveScore`, render) se reemplazan por un único `const real = REAL_GAMES[game.id]`; el resto de placeholders sigue con la simulación visual.
- `app/hall-of-fame/page.tsx`: el `isAsteroids` puntual se reemplaza por `tab in REAL_GAMES`, generalizando la carga real de Supabase a cualquier juego del registro (hoy: asteroids y caida).
- Eliminar `app/game/asteroids/page.tsx` y `app/game/asteroids/play/page.tsx`: Asteroids pasa a servirse por las rutas genéricas `app/game/[id]/page.tsx` y `app/game/[id]/play/page.tsx`, igual que Tetris.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `caida` para describir el juego real (líneas, niveles, siguiente pieza); `id`, `cover: "cover-tetro"`, `cat`, `color`, `best`, `plays` no cambian.
- Tabla `games` en Supabase: nueva fila `id: "caida"` (mismo patrón SQL que la migración de `specs/06-leaderboard-supabase.md`), insertada antes de cualquier `insertScore('caida', ...)`.
- `/game/caida` (detalle, vía ruta genérica): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase, igual que hoy `/game/asteroids`.
- Controles: `ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`Space` con `preventDefault()`; `KeyX` (rotación alternativa) sin `preventDefault()`.
- Pausa unificada: se elimina la tecla `P` y el overlay de pausa propio del juego original; el único control de pausa visible es el botón "PAUSA" del chasis, conectado a `pause()/resume()` del `GameHandle`.
- Overlay de game over propio (con botón "Reiniciar") se elimina; al llegar a `gameover` se llama `onGameOver(score)` una sola vez y se reutiliza el modal existente de `GamePlayer`.
- HUD: se reporta `lives: 1` de forma constante mientras `state === "playing"` (Tetris no tiene sistema de vidas — una sola "vida", termina al apilarse las piezas hasta el techo); `level` mapea 1:1 al `level` real de Tetris (`floor(lines/10)+1`); no se introduce un campo `lines` en el contrato genérico.
- Layout dentro de `.crt-screen`: canvas principal (300×600) centrado manteniendo su relación de aspecto nativa (letterbox); canvas de siguiente pieza posicionado de forma absoluta hacia la derecha, sin alinearse formalmente con el principal.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles.
- Lógica real para los 6 juegos restantes del catálogo (siguen con la simulación visual de spec 01).
- Auth real de Supabase / endurecer RLS (sigue público, igual que Asteroids).
- Migrar entradas antiguas de `localStorage` `av_scores`.
- Rediseñar `.crt-screen`/el chasis para adaptarse mejor a relaciones de aspecto verticales — se resuelve con letterbox dentro del contenedor 4:3 existente, sin tocar su CSS estructural.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo que ya soportan (manejo de <3 filas, `key={r.name}`) — no se tocan en este spec.
- Tests automatizados (no hay test runner configurado).

## Data model

```ts
// app/components/games/types.ts (nuevo)
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
```

`Asteroids.tsx` pasa a `import type { GameHandle, GameProps } from "./types"` y usa `forwardRef<GameHandle, GameProps>` (se eliminan `AsteroidsHandle`/`AsteroidsProps` propios, sin cambio de comportamiento).

```ts
// app/components/games/Tetris.tsx
import type { GameHandle, GameProps } from "./types";

const Tetris = forwardRef<GameHandle, GameProps>(function Tetris(
  { onStateChange, onGameOver },
  ref,
) {
  // useEffect único: board/current/next/score/lines/level/state ("playing"|"gameover")
  // reportState(): onStateChange({ score, lives: state === "playing" ? 1 : 0, level });
  //                onGameOver(score) una sola vez al pasar a "gameover"
});
```

```ts
// app/data/realGames.ts (nuevo)
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
```

`GamePlayer.tsx` reemplaza `isAsteroids` por:

```ts
const real = REAL_GAMES[game.id];
// real ? <real.component ref={realRef} onStateChange={...} onGameOver={...} /> : <simulación .game-arena />
```

`app/data/games.ts`, entrada `caida` (solo cambian `short`/`long`, resto igual):

```ts
{
  id: "caida",
  title: "CAÍDA",
  short: "...",   // texto real pendiente de redacción en la implementación
  long: "...",    // texto real pendiente de redacción en la implementación
  cat: "PUZZLE",
  cover: "cover-tetro",
  color: "magenta",
  best: 184220,
  plays: "31.8K",
}
```

Fila nueva en Supabase `games` (mismo esquema de `specs/06-leaderboard-supabase.md`, sin cambios de tabla):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'caida',
  'CAÍDA',
  '...',   -- mismo short que en games.ts
  '...',   -- mismo long que en games.ts
  'PUZZLE',
  'cover-tetro',
  'magenta',
  184220,
  '31.8K'
);
```

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

## Implementation plan

1. Crear `app/components/games/types.ts` con `GameHandle`/`GameProps`; adaptar `Asteroids.tsx` para importarlos y eliminar sus interfaces propias (`AsteroidsHandle`/`AsteroidsProps`), sin cambiar su comportamiento. Prueba manual: `/game/asteroids/play` sigue funcionando igual.
2. Crear `app/components/games/Tetris.tsx`: portar el estado y el loop de `game.js` (tablero, pieza actual/siguiente, colisión, rotación con kicks, `clearLines`, drop) dentro de un único `useEffect`, dibujando en dos `<canvas>` (tablero 300×600, preview 120×120). Aún sin `forwardRef` ni wiring — componente autocontenido, no montado en ningún lado todavía.
3. Adaptar el input dentro del mismo `useEffect`: listeners en `window` con `preventDefault()` en `ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`Space` (cleanup en el `return`); se elimina la tecla `P` y su overlay de pausa, y el overlay propio de game over (con botón "Reiniciar") del original.
4. Agregar `reportState()`: diffing manual de `score`/`level` contra los últimos reportados; `lives` se reporta `1` mientras `state === "playing"` y `0` al llegar a `"gameover"`; `onGameOver(score)` se dispara una sola vez en esa transición.
5. Exponer `GameHandle` vía `forwardRef` + `useImperativeHandle` (`pause`/`resume`/`forceGameOver`) siguiendo el patrón `controlsRef` de Asteroids.
6. Crear `app/data/realGames.ts` con `REAL_GAMES` registrando `asteroids` (componente `Asteroids`) y `caida` (componente `Tetris`, ya completo desde el paso 5).
7. Refactorizar `GamePlayer.tsx`: reemplazar las 7 bifurcaciones `isAsteroids` por `const real = REAL_GAMES[game.id]`; renderizar `real.component` dentro de `.crt-screen` cuando exista, con el canvas principal de Tetris centrado (letterbox) y el de siguiente pieza posicionado absoluto a la derecha; conectar botones "PAUSA"/"FIN" al `GameHandle` genérico. Prueba manual: Asteroids sigue funcionando igual; Tetris ya es jugable dentro de `GamePlayer` (aunque su leaderboard/catálogo todavía no tengan datos reales).
8. Refactorizar `app/hall-of-fame/page.tsx`: reemplazar el `isAsteroids` puntual por `tab in REAL_GAMES`, generalizando la carga de Supabase (`getTopScores`/`getPlayerBest`) a cualquier id del registro.
9. Eliminar `app/game/asteroids/page.tsx` y `app/game/asteroids/play/page.tsx`. Prueba manual: `/game/asteroids` y `/game/asteroids/play` siguen funcionando, ahora servidos por las rutas genéricas `app/game/[id]/*`.
10. Actualizar `app/data/games.ts`: reescribir `short`/`long` de la entrada `caida` para reflejar el juego real (líneas, niveles, siguiente pieza).
11. Escribir y aplicar la migración SQL (`insert into games ...` para `id: 'caida'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.
12. Prueba manual completa: jugar una partida de Tetris en `/game/caida/play` (mover, rotar, soft drop, hard drop, preview de siguiente pieza, limpiar líneas, subir de nivel, pausar/reanudar con el botón del chasis, "FIN", y game over real al apilar piezas hasta el techo); guardar puntuación y confirmar que aparece en `/game/caida` y en el tab CAÍDA del Salón de la Fama; confirmar que Asteroids y el resto del catálogo no sufrieron regresión.

## Acceptance criteria

- [ ] `/game/caida/play` monta el canvas real de Tetris (tablero 300×600 centrado dentro de `.crt-screen`, preview de siguiente pieza visible a la derecha) en vez de la simulación CSS (`.game-arena`).
- [ ] Mover (`←`/`→`), soft drop (`↓`), rotar (`↑` o `X`), hard drop (`Espacio`), wall kicks y limpieza de líneas funcionan igual que en `references/started-games/03-tetris`.
- [ ] El preview de "siguiente pieza" se actualiza correctamente cada vez que se coloca una pieza.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real; "Vidas" muestra `1` mientras se juega y `0` al terminar la partida.
- [ ] Pulsar "PAUSA" congela el juego (piezas dejan de caer); "REANUDAR" lo retoma exactamente donde quedó; la tecla `P` ya no tiene efecto.
- [ ] Pulsar "FIN" fuerza game over inmediato y abre el modal existente de `GamePlayer` con el score real acumulado.
- [ ] Apilar piezas hasta el techo (sin pulsar "FIN") también abre el modal de fin de partida con el score real, sin mostrar el overlay propio del juego original.
- [ ] Guardar la puntuación en el modal inserta una fila en Supabase `scores` (`game_id: "caida"`, `name`, `score`).
- [ ] Las teclas `ArrowLeft`/`ArrowRight`/`ArrowDown`/`ArrowUp`/`Space` no hacen scroll de la página mientras se juega Tetris.
- [ ] `/game/caida` muestra `short`/`long` actualizados describiendo el juego real, leaderboard real desde Supabase, y "Partidas"/"Mejor global" calculados desde `scores` (0 en ambos si la tabla está vacía para ese id).
- [ ] El tab CAÍDA de `/hall-of-fame` muestra podio + tabla con datos reales de Supabase, con el mismo manejo de <3 filas que ya tiene Asteroids.
- [ ] `/game/asteroids` y `/game/asteroids/play` siguen funcionando exactamente igual que antes, ahora servidos por las rutas genéricas `app/game/[id]/*` (los archivos estáticos dedicados ya no existen).
- [ ] Los 5 juegos placeholder restantes (`bloque-buster`, `serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando la simulación visual sin cambios, sin regresión.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/caida`, `/game/caida/play`, `/game/asteroids`, `/game/asteroids/play` y `/hall-of-fame`.

## Decisions

- **Sí:** doblar la introducción del registro genérico `app/data/realGames.ts` en este mismo spec, en vez de un spec prerequisito separado. Decisión explícita del usuario — la skill `/spec-game` recomienda separarlo (cambio estructural independientemente commiteable), pero se opta por resolverlo junto con Tetris.
- **Sí:** reusar el id de catálogo existente `caida` (PUZZLE, `cover-tetro`) para Tetris, en vez de crear un id nuevo. Ya calza en categoría y portada; evita CSS nuevo.
- **Sí:** Tetris reporta `lives: 1` mientras juega y `0` en game over, en vez de omitir el campo o repurpose-arlo como contador de líneas. Decisión explícita del usuario — "todos los juegos tienen vidas, en este caso Tetris tiene una sola vida".
- **No:** agregar un campo `lines` al contrato genérico `GameProps`. El nivel (`level`) ya refleja el progreso (`floor(lines/10)+1`); no se generaliza el HUD más allá de lo que Asteroids ya define.
- **Sí:** canvas principal (300×600) centrado dentro de `.crt-screen` manteniendo su relación de aspecto nativa (letterbox); canvas de siguiente pieza posicionado absoluto a la derecha sin alinearse formalmente. Decisión explícita del usuario — no se rediseña el contenedor 4:3 del chasis.
- **Sí:** el contrato `GameHandle`/`GameProps` se extrae a `app/components/games/types.ts` compartido entre `Asteroids.tsx` y `Tetris.tsx`, en vez de que cada juego declare su propia interfaz duplicada.
- **Sí:** el componente se llama `Tetris.tsx` (nombre del juego), no `Caida.tsx` (id de catálogo) — mismo criterio que `Asteroids.tsx` (nombre del juego, no del id `"rocas"` original).
- **Sí:** único control de pausa visible es el botón "PAUSA" del chasis; se elimina la tecla `P` y el overlay de pausa propio del original. Decisión explícita del usuario, mismo criterio que ya aplica para "FIN"/game over en Asteroids.
- **Sí:** se elimina el overlay de game over propio (con botón "Reiniciar") del juego original; se reutiliza el modal existente de `GamePlayer`. Ningún juego real duplica esa UI.
- **Sí:** se eliminan `app/game/asteroids/page.tsx` y `app/game/asteroids/play/page.tsx` al introducir el registro; Asteroids pasa a servirse por las rutas genéricas `app/game/[id]/*`, igual que Tetris. Decisión explícita del usuario — evita mantener dos patrones de ruteo para juegos reales.
- **Sí:** se reescriben `short`/`long` de `caida` en `games.ts` para describir el juego real (líneas, niveles, siguiente pieza), en vez de dejar el texto genérico del placeholder. Mismo criterio que el spec 05/06 aplicó a Asteroids.
- **No:** controles táctiles/móviles en este spec. El juego de referencia es solo-teclado y se replica tal cual.
- **No:** tocar `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx` más allá de lo que ya soportan — no hace falta, ya manejan <3 filas.
- **No:** endurecer RLS ni introducir Auth real de Supabase en este spec. Sigue público, igual que Asteroids.

## Risks

| Risk                                                                                                                                                               | Mitigación                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('caida', ...)` falla silenciosamente (`.catch(() => {})`) si la fila `games` no existe todavía                                           | El plan aplica la migración (paso 11) antes de la prueba manual completa (paso 12), que es el primer momento en que se guarda un score real. |
| Refactor de `GamePlayer.tsx`/`hall-of-fame` a lookup por registro rompe a Asteroids por regresión                                                                  | Cada paso que toca estos archivos (7 y 8) incluye prueba manual explícita de que Asteroids sigue funcionando igual antes de continuar.       |
| Eliminar las rutas estáticas de Asteroids expone un momento en que `/game/asteroids` podría no resolver si el registro no está bien cableado a las rutas genéricas | Se elimina en un paso propio (9) con prueba manual inmediata de que ambas rutas responden vía `app/game/[id]/*`.                             |
| Canvas de Tetris (300×600) letterboxed dentro de `.crt-screen` (4:3) deja franjas vacías notablemente más grandes que en Asteroids                                 | Aceptado — es el layout explícitamente decidido; no se rediseña el contenedor.                                                               |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de Tetris con el mismo nombre colisionan                                                                      | No es un bloqueante (Asteroids ya lo tiene); no se corrige en este spec.                                                                     |
| `HallOfFameTable.tsx` tiene una fecha hardcodeada (`11/05/2026`) en su fila "tú"                                                                                   | Bug preexistente, no introducido por este spec; no se corrige aquí.                                                                          |
| Doble fuente de verdad entre el HUD de React y cualquier texto residual dibujado en el canvas de Tetris                                                            | Se elimina explícitamente el HUD propio en DOM (`#score`/`#lines`/`#level`) del original al portar — el único HUD visible es el de React.    |

## What is **not** in this spec

- Controles táctiles/móviles.
- Lógica real para los 6 juegos restantes del catálogo.
- Auth real de Supabase / RLS endurecido.
- Migración de `localStorage` `av_scores` antiguo.
- Rediseño del contenedor `.crt-screen`/chasis para relaciones de aspecto verticales.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

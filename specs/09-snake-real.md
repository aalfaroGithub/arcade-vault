# SPEC 09 — Snake real (diseño nuevo)

> **Status:** Implementado
> **Depends on:** 06-leaderboard-supabase, 07-tetris-real-registro
> **Date:** 2026-08-07
> **Objective:** Diseñar e implementar `Snake.tsx`, un juego real de Snake (grilla, sprites de fruta portados) para el catálogo id `serpentina`, registrado en `REAL_GAMES` y con leaderboard real en Supabase igual que Asteroids/Tetris/Arkanoid.

## Scope

**In:**

- Componente `app/components/games/Snake.tsx` (client component): juego de Snake diseñado desde cero (sin `game.js` de referencia — no existe carpeta en `references/started-games/` para este juego), sobre un único `<canvas>` 800×600 (grilla de 20×15 celdas de 40px, aspect ratio 4:3 nativo, coincide con `.crt-screen`), siguiendo el patrón obligatorio ya establecido (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`).
- Movimiento por pasos de grilla a intervalo fijo (tick), no frame-continuo: la serpiente avanza una celda por tick; el intervalo se acorta a medida que sube el nivel. El loop sigue siendo `requestAnimationFrame` (mismo patrón que Asteroids/Tetris/Arkanoid, con `dt` capado), acumulando tiempo hasta cruzar el umbral del tick actual — no se usa `setInterval`.
- Dibujo vectorial de la serpiente (cabeza + cuerpo, con canvas 2D) y del tablero; la fruta a comer se dibuja con un sprite aleatorio del atlas de frutas portado.
- Asset `public/games/serpentina/fruits.png` (copia de `references/source-assets/snake-assets/fruits.png`), referenciado por ruta absoluta.
- Coordenadas de recorte de `references/source-assets/snake-assets/sprites.js` (solo la fila pixel-art de frutas, `y=136–295`) portadas como un objeto TS embebido dentro de `Snake.tsx` (mismo criterio que Arkanoid porta `spritesheet.js` al mismo archivo, spec 08), no como script global `window.SPRITE_ATLAS`.
- Selección de sprite de fruta aleatoria entre las 21 disponibles cada vez que aparece una fruta nueva (tras comer la anterior).
- Registro `app/data/realGames.ts`: nueva entrada `serpentina: { component: Snake }`.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `serpentina` para describir el juego real; `id`, `cover: "cover-snake"`, `cat`, `color`, `best`, `plays` no cambian. No se toca `app/globals.css` (la clase `.cover-snake` ya existe).
- Tabla `games` en Supabase: nueva fila `id: "serpentina"` (mismo patrón SQL que las migraciones de specs 06/07/08), insertada antes de cualquier `insertScore('serpentina', ...)`.
- `/game/serpentina` (detalle, vía ruta genérica existente): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase.
- Controles: solo teclado — `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` con `preventDefault()`; se ignora una entrada que invertiría la dirección actual 180° sobre la propia cola (evita autochoque instantáneo por input).
- Terminal states: choque contra el borde del tablero o contra la propia cola → game over (sin wrap toroidal).
- HUD: `lives` se reporta `1` mientras `state === "playing"` y `0` en `"gameover"` (Snake no tiene sistema de vidas — mismo criterio que Tetris, spec 07); `level` sube cada N frutas comidas y acelera el tick de movimiento.
- Pausa unificada: el único control de pausa visible es el botón "PAUSA" del chasis (`GamePlayer`), sin overlay propio en canvas.
- Overlay propio de fin de partida se omite (no hay overlay que "eliminar" porque el juego es diseño nuevo); al llegar a `gameover` se llama `onGameOver(score)` una sola vez y se reutiliza el modal existente de `GamePlayer`.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles.
- Wrap toroidal de bordes (se descarta explícitamente a favor de game over clásico).
- Lógica real para los 4 juegos placeholder restantes del catálogo (`gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Auth real de Supabase / endurecer RLS (sigue público, igual que los otros juegos reales).
- Migrar entradas antiguas de `localStorage` `av_scores`.
- Puntuación diferenciada por tipo de fruta (todas otorgan el mismo puntaje).
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Cambios a `GamePlayer.tsx` (ya generaliza vía `REAL_GAMES`, no necesita tocarse para un juego nuevo del registro).
- Tests automatizados (no hay test runner configurado).

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
}
```

```ts
// app/components/games/Snake.tsx
import type { GameHandle, GameProps } from "./types";

const Snake = forwardRef<GameHandle, GameProps>(function Snake(
  { onStateChange, onGameOver },
  ref,
) {
  // useEffect único: grid 20x15 (celda 40px) / snake (array de {col,row}) / dir / nextDir
  //                  / fruit ({col,row,spriteKey}) / score / level / tickMs / state ("playing"|"gameover")
  // reportState(): onStateChange({ score, lives: state === "playing" ? 1 : 0, level });
  //                onGameOver(score) una sola vez al pasar a "gameover"
});
```

```ts
// Atlas de sprites embebido en Snake.tsx (portado de sprites.js, solo fila pixel-art de frutas)
const FRUIT_SPRITES: Record<
  string,
  { x: number; y: number; w: number; h: number }
> = {
  banana: { x: 34, y: 136, w: 110, h: 160 },
  orange: { x: 186, y: 136, w: 150, h: 160 },
  // ...las 21 entradas de la fila y=136–295, ver references/source-assets/snake-assets/sprites.js
};
const FRUIT_KEYS = Object.keys(FRUIT_SPRITES);
```

```ts
// app/data/realGames.ts — agrega una entrada
import Snake from "../components/games/Snake";

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { component: Asteroids },
  caida: { component: Tetris },
  "bloque-buster": { component: Arkanoid },
  serpentina: { component: Snake },
};
```

```ts
// app/data/games.ts, entrada serpentina (solo cambian short/long, resto igual)
{
  id: "serpentina",
  title: "SERPENTINA",
  short: "...",   // texto real pendiente de redacción en la implementación
  long: "...",    // texto real pendiente de redacción en la implementación
  cat: "ARCADE",
  cover: "cover-snake",
  color: "green",
  best: 7820,
  plays: "9.1K",
}
```

Fila nueva en Supabase `games` (mismo esquema de `specs/06-leaderboard-supabase.md`, sin cambios de tabla):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'serpentina',
  'SERPENTINA',
  '...',   -- mismo short que en games.ts
  '...',   -- mismo long que en games.ts
  'ARCADE',
  'cover-snake',
  'green',
  7820,
  '9.1K'
);
```

Convenciones internas (dentro del `useEffect`, no expuestas fuera del componente):

- Grilla: 20 columnas × 15 filas, celda de 40px. Coordenadas en `{col, row}`, origen arriba-izquierda.
- `snake`: array de segmentos `{col, row}`, `snake[0]` es la cabeza.
- Tick inicial: 150ms/paso; baja (más rápido) un monto fijo por nivel, con un piso mínimo para no volverse injugable.
- Cada 5 frutas comidas → `level++` y se acorta el tick.
- Cada fruta comida: `score += 10`, la serpiente crece un segmento, se reubica la fruta en una celda libre con un `spriteKey` aleatorio entre `FRUIT_KEYS`.

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

## Implementation plan

1. Crear `public/games/serpentina/fruits.png` (copia directa de `references/source-assets/snake-assets/fruits.png`). Prueba manual: el archivo es accesible vía `/games/serpentina/fruits.png` corriendo `npm run dev`.
2. Crear `app/components/games/Snake.tsx`: estado grid/snake/fruit/score/level/tickMs dentro de un único `useEffect`, dibujando en un `<canvas>` 800×600 (fondo, serpiente vectorial, fruta con sprite del atlas `FRUIT_SPRITES` embebido). Aún sin `forwardRef` ni wiring — componente autocontenido, no montado en ningún lado todavía.
3. Adaptar el input dentro del mismo `useEffect`: listeners en `window` con `preventDefault()` en `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` (cleanup en el `return`); una entrada que invertiría la dirección actual 180° se ignora silenciosamente.
4. Implementar el loop de tick sobre `requestAnimationFrame` (con `dt` capado, mismo patrón que Asteroids): acumular tiempo hasta cruzar `tickMs`, entonces mover la serpiente una celda, detectar colisión contra borde/cola → `state = "gameover"`, detectar si la cabeza llega a la celda de la fruta → crecer, sumar `score`, reubicar fruta con `spriteKey` aleatorio, y subir `level`/acortar `tickMs` cada 5 frutas.
5. Agregar `reportState()`: diffing manual de `score`/`level` contra los últimos reportados; `lives` se reporta `1` mientras `state === "playing"` y `0` al llegar a `"gameover"`; `onGameOver(score)` se dispara una sola vez en esa transición.
6. Exponer `GameHandle` vía `forwardRef` + `useImperativeHandle` (`pause`/`resume`/`forceGameOver`) siguiendo el patrón `controlsRef` de Asteroids/Tetris/Arkanoid.
7. Agregar `Snake` a `app/data/realGames.ts` bajo la clave `"serpentina"`. Prueba manual: `GamePlayer` (sin cambios propios) ya renderiza el canvas real de Snake al entrar a `/game/serpentina/play`, con HUD, PAUSA/FIN y modal de fin de partida funcionando igual que los otros juegos reales.
8. Actualizar `app/data/games.ts`: reescribir `short`/`long` de la entrada `serpentina` para reflejar el juego real (grilla, frutas, niveles).
9. Escribir y aplicar la migración SQL (`insert into games ...` para `id: 'serpentina'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.
10. Prueba manual completa: jugar una partida de Snake en `/game/serpentina/play` (mover en las 4 direcciones, confirmar que invertir 180° no causa autochoque, comer varias frutas con sprites variados, crecer, subir de nivel y notar la aceleración del tick, chocar contra el borde, chocar contra la propia cola, pausar/reanudar con el botón del chasis, "FIN"); guardar puntuación y confirmar que aparece en `/game/serpentina` y en el tab SERPENTINA del Salón de la Fama; confirmar que Asteroids, Tetris, Arkanoid y el resto del catálogo no sufrieron regresión.

## Acceptance criteria

- [x] `/game/serpentina/play` monta el canvas real de Snake (800×600, grilla 20×15, sprites de fruta) en vez de la simulación CSS (`.game-arena`).
- [x] Las 4 flechas mueven la serpiente en pasos de grilla; presionar la flecha opuesta a la dirección actual no causa un autochoque instantáneo (se ignora el input).
- [x] Comer una fruta suma 10 puntos, hace crecer la serpiente un segmento, y reubica la siguiente fruta con un sprite aleatorio entre las 21 del atlas.
- [x] Cada 5 frutas comidas sube el `level` y el movimiento se acelera (tick más corto).
- [x] Chocar contra el borde del tablero dispara `onGameOver(score)` una sola vez y abre el modal existente de `GamePlayer`; no hay wrap toroidal.
- [x] Chocar contra la propia cola dispara `onGameOver(score)` de la misma forma.
- [x] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real; "Vidas" muestra `1` mientras se juega y `0` al terminar la partida.
- [x] Pulsar "PAUSA" congela el juego (la serpiente deja de avanzar); "REANUDAR" lo retoma exactamente donde quedó.
- [x] Pulsar "FIN" fuerza game over inmediato y abre el modal existente con el score real acumulado.
- [x] Guardar la puntuación en el modal inserta una fila en Supabase `scores` (`game_id: "serpentina"`, `name`, `score`).
- [x] Las teclas de flecha no hacen scroll de la página mientras se juega Snake.
- [x] `/game/serpentina` muestra `short`/`long` actualizados describiendo el juego real, leaderboard real desde Supabase, y "Partidas"/"Mejor global" calculados desde `scores` (0 en ambos si la tabla está vacía para ese id).
- [x] El tab SERPENTINA de `/hall-of-fame` muestra podio + tabla con datos reales de Supabase, con el mismo manejo de <3 filas que ya tienen Asteroids/Tetris/Arkanoid.
- [x] Los 4 juegos placeholder restantes (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) siguen mostrando la simulación visual sin cambios, sin regresión.
- [x] `/game/asteroids/play`, `/game/caida/play` y `/game/bloque-buster/play` siguen funcionando exactamente igual que antes.
- [x] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/serpentina`, `/game/serpentina/play` y `/hall-of-fame`.

## Decisions

- **Sí:** diseñar Snake desde cero, sin `game.js` de referencia — no existe una carpeta correspondiente en `references/started-games/`, solo el atlas de sprites de fruta bajo `references/source-assets/snake-assets/`. Decisión explícita del usuario.
- **Sí:** reusar el id de catálogo existente `serpentina` (ARCADE, `cover-snake`, verde) para Snake, en vez de crear un id nuevo. Ya calza en categoría y portada; evita CSS nuevo, mismo criterio que `caida`→Tetris y `bloque-buster`→Arkanoid.
- **Sí:** dibujar la serpiente y el tablero de forma vectorial (canvas 2D), y usar sprites solo para la fruta a comer. Decisión explícita del usuario — no hay sprite de cabeza/cuerpo de serpiente entregado, y mezclar vectorial+sprite mantiene consistencia con el resto del catálogo (Asteroids/Tetris son 100% vectoriales).
- **Sí:** Snake reporta `lives: 1` mientras juega y `0` en game over, igual que Tetris (spec 07) — no se agrega un campo nuevo al contrato genérico `GameProps` ni se omite el campo.
- **Sí:** choque contra el borde del tablero es game over clásico, sin wrap toroidal (a diferencia de Asteroids). Decisión explícita del usuario.
- **Sí:** grilla 800×600 = 20×15 celdas de 40px, llenando `.crt-screen` sin letterbox (a diferencia de Tetris, que sí usa letterbox por ser vertical). Decisión explícita del usuario.
- **Sí:** el juego acelera por nivel — cada 5 frutas comidas sube `level` y acorta el tick de movimiento. Da uso real al campo `level` del HUD.
- **Sí:** el loop sigue siendo `requestAnimationFrame` con `dt` acumulado hasta cruzar el `tickMs` actual, no `setInterval` — mantiene el mismo patrón de pausa/resume (`cancelAnimationFrame`/`lastTime = null`) que Asteroids/Tetris/Arkanoid, aplicado a un juego de movimiento discreto por primera vez en el catálogo.
- **Sí:** se ignora una entrada de dirección que invertiría la serpiente 180° sobre sí misma — estándar en Snake, evita un autochoque instantáneo causado por el propio input del jugador.
- **Sí:** el sprite de la fruta se elige al azar entre las 21 disponibles cada vez que aparece una nueva, sin diferenciar puntaje por tipo. Decisión explícita del usuario — variedad visual sin lógica de puntuación extra.
- **Sí:** `fruits.png` se copia a `public/games/serpentina/fruits.png` (mismo patrón de namespacing `public/games/<juego>/` que introdujo Arkanoid en spec 08); las coordenadas de `sprites.js` se portan como un objeto TS (`FRUIT_SPRITES`) embebido en `Snake.tsx`, no como script global `window.SPRITE_ATLAS`.
- **Sí:** el componente se llama `Snake.tsx` (nombre del juego), no `Serpentina.tsx` (id de catálogo) — mismo criterio que `Asteroids.tsx`/`Tetris.tsx`/`Arkanoid.tsx`.
- **Sí:** único control de pausa visible es el botón "PAUSA" del chasis; no hay overlay de pausa propio que "eliminar" porque el juego es diseño nuevo (a diferencia de los ports, que sí tenían uno original que remover).
- **No:** wrap toroidal de bordes — se descarta explícitamente a favor del comportamiento clásico de Snake (game over al chocar).
- **No:** puntuación diferenciada por tipo de fruta. Todas otorgan 10 puntos.
- **No:** controles táctiles/móviles en este spec.
- **No:** tocar `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx` más allá de lo ya existente — el registro `REAL_GAMES` ya generaliza la integración de un juego nuevo sin tocar esos archivos.
- **No:** endurecer RLS ni introducir Auth real de Supabase en este spec. Sigue público, igual que los otros juegos reales.
- **Nota de proceso:** el resto del documento (este plan, criterios de aceptación, decisiones y riesgos) se redactó y guardó en un solo paso a pedido explícito del usuario, sin la confirmación sección-por-sección habitual de `/spec`/`/spec-game` para estas últimas secciones.

## Risks

| Risk                                                                                                                                                                | Mitigación                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('serpentina', ...)` falla silenciosamente (`.catch(() => {})`) si la fila `games` no existe todavía                                       | El plan aplica la migración (paso 9) antes de la prueba manual completa (paso 10), que es el primer momento en que se guarda un score real.                                                    |
| Movimiento discreto (grid-tick) implementado sobre un loop de `requestAnimationFrame` continuo es un patrón nuevo en el catálogo (los otros 3 juegos son continuos) | Se documenta explícitamente en Decisiones; el acumulador de tiempo hasta cruzar `tickMs` es la única lógica nueva, el resto del loop (pausa/resume/dt capado) es idéntico al patrón existente. |
| Sin sprite propio de cabeza/cuerpo de serpiente, el resultado visual puede sentirse menos pulido que Arkanoid (que sí tiene spritesheet completo)                   | Aceptado — decisión explícita del usuario de ir 100% vectorial para la serpiente; consistente con el estilo de Asteroids/Tetris.                                                               |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de Snake con el mismo nombre colisionan                                                                        | No es un bloqueante (los otros juegos reales ya lo tienen); no se corrige en este spec.                                                                                                        |
| `HallOfFameTable.tsx` tiene una fecha hardcodeada (`11/05/2026`) en su fila "tú"                                                                                    | Bug preexistente, no introducido por este spec; no se corrige aquí.                                                                                                                            |

## What is **not** in this spec

- Controles táctiles/móviles.
- Wrap toroidal de bordes.
- Puntuación diferenciada por tipo de fruta.
- Lógica real para los 4 juegos placeholder restantes del catálogo.
- Auth real de Supabase / RLS endurecido.
- Migración de `localStorage` `av_scores` antiguo.
- Cambios a `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

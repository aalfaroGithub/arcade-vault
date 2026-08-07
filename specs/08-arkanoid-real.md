# SPEC 08 — Arkanoid real y assets porteados

> **Status:** Implemented
> **Depends on:** 05-asteroids-real, 06-leaderboard-supabase, 07-tetris-real-registro
> **Date:** 2026-08-07
> **Objective:** Portar `references/started-games/04-arkanoid/game.js` a un componente React (`Arkanoid.tsx`) para el catálogo id `bloque-buster`, con spritesheet y sonidos porteados a `public/`, registrado en `REAL_GAMES` y con leaderboard real en Supabase igual que Asteroids y Tetris.

## Scope

**In:**

- Componente `app/components/games/Arkanoid.tsx` (client component): puerto completo de `references/started-games/04-arkanoid/game.js` + `levels.js` sobre un único `<canvas>` 800×600 (aspect ratio 4:3 nativo, coincide exactamente con `.crt-screen`), siguiendo el patrón obligatorio de Asteroids/Tetris (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`).
- Assets porteados a `public/games/arkanoid/`: `spritesheet-breakout.png` y `sounds/ball-bounce.mp3` + `sounds/break-sound.mp3`, referenciados por ruta absoluta (`/games/arkanoid/...`) en vez de las rutas relativas del original.
- Lógica de `spritesheet.js` (`loadSpritesheet`, `drawSprite`, `drawFrame`, `SPRITES`, `EXPLOSION_FRAMES`, `EXPLOSION_DURATION`) portada dentro del mismo `useEffect` de `Arkanoid.tsx` (no como módulo global aparte, siguiendo la regla de estado mutable único).
- Los 5 niveles de `levels.js` (grillas de bloques + multiplicador de velocidad) se portan tal cual, como datos dentro del mismo archivo o un módulo `levels.ts` sin estado propio.
- Registro `app/data/realGames.ts`: nueva entrada `bloque-buster: { component: Arkanoid }`.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `bloque-buster` para describir el juego real (paleta, niveles, bloques); `id`, `cover: "cover-bricks"`, `cat`, `color`, `best`, `plays` no cambian. No se toca `app/globals.css` (la clase `.cover-bricks` ya existe).
- Tabla `games` en Supabase: nueva fila `id: "bloque-buster"` (mismo patrón SQL que las migraciones de specs 06 y 07), insertada antes de cualquier `insertScore('bloque-buster', ...)`.
- `/game/bloque-buster` (detalle, vía ruta genérica existente): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase.
- Controles: solo teclado — `ArrowLeft`/`ArrowRight` (mover paleta) con `preventDefault()`. Se elimina el control por mouse del original (`mousemove` sobre la paleta, `click` sobre los botones de nivel).
- HUD: `lives` se reporta con el contador real de vidas (inicia en 3, decrementa al perder la pelota, mapeo 1:1 con el original); `level` mapea 1:1 al nivel actual (1–5).
- Estado "win" (completar los 5 niveles): se trata igual que "gameover" — dispara `onGameOver(score)` una sola vez, sin distinguir victoria de derrota en el contrato ni en el modal genérico de `GamePlayer`.
- Pausa unificada: se elimina la tecla `P`/`Escape` y el overlay de pausa dibujado en canvas; el único control de pausa visible sigue siendo el botón "PAUSA" del chasis (`GamePlayer`), sin tocar `GamePlayer.tsx`.
- Selector de nivel (saltar a nivel 1–5): se conserva como función, mapeado a las teclas `1`–`5`, activas únicamente mientras el juego está pausado vía el botón del chasis. No se dibuja overlay propio en el canvas para esto.
- Overlay propio de fin de partida/victoria (`drawOverlay`) se elimina; al llegar a `gameover` o completar el nivel 5 se llama `onGameOver(score)` una sola vez y se reutiliza el modal existente de `GamePlayer`.
- Estado de carga de assets: mientras `loadSpritesheet` no ha terminado, el canvas dibuja el texto "CARGANDO..." (fondo negro, tipografía monospace) y el loop no arranca.
- Sonidos (`ball-bounce.mp3`, `break-sound.mp3`) se reproducen igual que el original (`.cloneNode().play()` en cada rebote/rotura), sin control de volumen ni mute nuevo.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles.
- Lógica real para los 4 juegos placeholder restantes del catálogo (`serpentina`, `gloton`, `invasores`, `ranaria`, `duelo-pixel`).
- Auth real de Supabase / endurecer RLS (sigue público, igual que Asteroids/Tetris).
- Migrar entradas antiguas de `localStorage` `av_scores`.
- Control por mouse de la paleta.
- Overlay de selección de nivel dibujado en canvas (se reemplaza por teclas `1`–`5`).
- Control de volumen/mute de los sonidos porteados.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Cambios a `GamePlayer.tsx` (el overlay "EN PAUSA" existente se reutiliza sin modificar).
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
// app/components/games/Arkanoid.tsx
import type { GameHandle, GameProps } from "./types";

const Arkanoid = forwardRef<GameHandle, GameProps>(function Arkanoid(
  { onStateChange, onGameOver },
  ref,
) {
  // useEffect único: paddle/ball/blocks/explosions/score/lives/level/state ("loading"|"playing"|"gameover")
  // "loading" es interno (mientras loadSpritesheet no ha resuelto), no forma parte del contrato público
  // reportState(): onStateChange({ score, lives, level });
  //                onGameOver(score) una sola vez al pasar a "gameover" (por perder o por completar nivel 5)
});
```

```ts
// app/data/realGames.ts — agrega una entrada
import Arkanoid from "../components/games/Arkanoid";

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { component: Asteroids },
  caida: { component: Tetris },
  "bloque-buster": { component: Arkanoid },
};
```

```ts
// app/data/games.ts, entrada bloque-buster (solo cambian short/long, resto igual)
{
  id: "bloque-buster",
  title: "BLOQUE BUSTER",
  short: "...",   // texto real pendiente de redacción en la implementación
  long: "...",    // texto real pendiente de redacción en la implementación
  cat: "ARCADE",
  cover: "cover-bricks",
  color: "cyan",
  best: 28450,
  plays: "12.4K",
}
```

Fila nueva en Supabase `games` (mismo esquema de `specs/06-leaderboard-supabase.md`, sin cambios de tabla):

```sql
insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'bloque-buster',
  'BLOQUE BUSTER',
  '...',   -- mismo short que en games.ts
  '...',   -- mismo long que en games.ts
  'ARCADE',
  'cover-bricks',
  'cyan',
  28450,
  '12.4K'
);
```

Datos internos portados sin cambio de forma (dentro del `useEffect`, no expuestos fuera del componente):

```ts
// levels: LEVELS[n-1] = { speed: number, blocks: [{ col, row, color }] }
// paddle: { x, y, w: 162, h: 14 } (ancho real del sprite, no 81 como en el HTML original)
// ball: { x, y, w: 16, h: 16, vx, vy }
// blocks[]: [{ x, y, w, h, color, alive }]
// explosions[]: animaciones activas (4 frames, EXPLOSION_DURATION ms)
```

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

## Implementation plan

1. Crear `public/games/arkanoid/spritesheet-breakout.png` y `public/games/arkanoid/sounds/ball-bounce.mp3` + `public/games/arkanoid/sounds/break-sound.mp3` (copia directa de `references/started-games/04-arkanoid/assets/`). Prueba manual: los archivos existen en `public/` y son accesibles vía `/games/arkanoid/...` corriendo `npm run dev`.
2. Crear `app/components/games/Arkanoid.tsx`: puerto del estado y loop de `game.js`+`levels.js` (paddle, ball, blocks, colisiones AABB, explosiones, niveles 1–5) dentro de un único `useEffect`, dibujando en un `<canvas>` 800×600 con `loadSpritesheet`/`drawSprite`/`drawFrame` portados al mismo archivo (rutas de imagen actualizadas a `/games/arkanoid/spritesheet-breakout.png`). Estado interno `"loading"` mientras la imagen no ha cargado (canvas negro + texto "CARGANDO..."); el loop no arranca hasta el callback de `loadSpritesheet`. Paleta corregida a `w: 162` (ancho real del sprite, ver Decisiones). Aún sin `forwardRef` ni wiring — componente autocontenido, no montado en ningún lado todavía.
3. Adaptar el input dentro del mismo `useEffect`: listeners en `window` con `preventDefault()` en `ArrowLeft`/`ArrowRight` (cleanup en el `return`); se elimina el control por mouse (`mousemove`/`click`) y la tecla `P`/`Escape` del original. Se agrega manejo de teclas `1`–`5` que, únicamente mientras el juego está pausado (ver paso 5), llaman a la función interna `loadLevel(n)` para saltar de nivel.
4. Agregar `reportState()`: diffing manual de `score`/`lives`/`level` contra los últimos reportados; al transitar a `"gameover"` (por perder la última vida) o a `"win"` interno (completar nivel 5) se llama `onGameOver(score)` una sola vez, sin overlay propio dibujado en el canvas (se elimina `drawOverlay`/`drawPauseOverlay` del original).
5. Reproducir sonidos igual que el original: `bounceSound.cloneNode().play()` en cada rebote de pared/paleta, `breakSound.cloneNode().play()` en cada bloque destruido, usando las rutas de `public/games/arkanoid/sounds/`.
6. Exponer `GameHandle` vía `forwardRef` + `useImperativeHandle` (`pause`/`resume`/`forceGameOver`) siguiendo el patrón `controlsRef` de Asteroids/Tetris; `pause()` congela el loop (las teclas `1`–`5` para saltar de nivel solo tienen efecto en este estado).
7. Agregar `Arkanoid` a `app/data/realGames.ts` bajo la clave `"bloque-buster"`. Prueba manual: `GamePlayer` (sin cambios propios) ya renderiza el canvas real de Arkanoid al entrar a `/game/bloque-buster/play`, con HUD, PAUSA/FIN y modal de fin de partida funcionando igual que Asteroids/Tetris.
8. Actualizar `app/data/games.ts`: reescribir `short`/`long` de la entrada `bloque-buster` para reflejar el juego real (paleta, niveles, bloques).
9. Escribir y aplicar la migración SQL (`insert into games ...` para `id: 'bloque-buster'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.
10. Prueba manual completa: jugar una partida de Arkanoid en `/game/bloque-buster/play` (mover paleta, rebotar pelota en pared/paleta/bloques, romper bloques con animación de explosión y sonido, perder una vida, completar un nivel y avanzar al siguiente con velocidad aumentada, pausar/reanudar con el botón del chasis, saltar de nivel con teclas `1`–`5` estando en pausa, "FIN", y game over real al perder las 3 vidas); completar los 5 niveles y confirmar que dispara el mismo modal de fin de partida; guardar puntuación y confirmar que aparece en `/game/bloque-buster` y en el tab BLOQUE BUSTER del Salón de la Fama; confirmar que Asteroids, Tetris y el resto del catálogo no sufrieron regresión.

## Acceptance criteria

- [ ] `public/games/arkanoid/spritesheet-breakout.png` y los 2 `.mp3` existen y se sirven correctamente en `npm run dev`.
- [ ] `/game/bloque-buster/play` monta el canvas real de Arkanoid (800×600, sprites del spritesheet, no formas vectoriales) en vez de la simulación CSS (`.game-arena`).
- [ ] Mover la paleta (`←`/`→`) funciona; el control por mouse no está presente.
- [ ] La pelota rebota correctamente en paredes, paleta y bloques; romper un bloque suma 10 puntos, reproduce `break-sound.mp3` y dibuja la animación de explosión (4 frames).
- [ ] Rebotes en pared/paleta reproducen `ball-bounce.mp3`.
- [ ] Perder la pelota (cae bajo la paleta) resta una vida; con 0 vidas se dispara `onGameOver(score)` una sola vez y aparece el modal de `GamePlayer`, sin overlay propio dibujado en el canvas.
- [ ] Limpiar todos los bloques de un nivel avanza al siguiente (velocidad de la pelota aumenta según `LEVELS[n].speed`); completar el nivel 5 dispara `onGameOver(score)` igual que quedarse sin vidas.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real, reflejando el score/vidas/nivel reales.
- [ ] Pulsar "PAUSA" congela el juego (pelota y paleta dejan de moverse); "REANUDAR" lo retoma exactamente donde quedó; la tecla `P`/`Escape` ya no tiene efecto.
- [ ] Mientras el juego está pausado, las teclas `1`–`5` saltan directamente al nivel correspondiente (sin overlay propio en canvas); fuera de pausa no tienen efecto.
- [ ] Pulsar "FIN" fuerza game over inmediato y abre el modal existente de `GamePlayer` con el score real acumulado.
- [ ] Guardar la puntuación en el modal inserta una fila en Supabase `scores` (`game_id: "bloque-buster"`, `name`, `score`).
- [ ] Las teclas `ArrowLeft`/`ArrowRight` no hacen scroll de la página mientras se juega Arkanoid.
- [ ] Mientras el spritesheet no ha cargado, el canvas muestra "CARGANDO..." sobre fondo negro y el juego no arranca; una vez cargado, el juego arranca normalmente.
- [ ] `/game/bloque-buster` muestra `short`/`long` actualizados describiendo el juego real, leaderboard real desde Supabase, y "Partidas"/"Mejor global" calculados desde `scores` (0 en ambos si la tabla está vacía para ese id).
- [ ] El tab BLOQUE BUSTER de `/hall-of-fame` muestra podio + tabla con datos reales de Supabase, con el mismo manejo de <3 filas que ya tienen Asteroids/Tetris.
- [ ] Los 5 juegos placeholder restantes siguen mostrando la simulación visual sin cambios, sin regresión.
- [ ] `/game/asteroids/play` y `/game/caida/play` siguen funcionando exactamente igual que antes.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/bloque-buster`, `/game/bloque-buster/play`, `/game/asteroids/play`, `/game/caida/play` y `/hall-of-fame`.

## Decisions

- **Sí:** portar spritesheet PNG y los 2 sonidos MP3 a `public/games/arkanoid/` en vez de redibujar el juego con formas vectoriales. Decisión explícita del usuario — prioriza fidelidad visual/sonora al original sobre consistencia con el estilo vectorial de Asteroids/Tetris. Primer juego real del catálogo con assets propios; por eso se namespacea bajo `public/games/<juego>/` en vez de `public/` a secas.
- **Sí:** el estado "loading" (mientras `loadSpritesheet` no resuelve) se maneja mostrando el texto "CARGANDO..." en el canvas, en vez de dejarlo negro sin indicación. Decisión explícita del usuario.
- **Sí:** completar los 5 niveles ("win") dispara `onGameOver(score)` igual que quedarse sin vidas, sin extender el contrato `GameProps`/`GameHandle` ni distinguir victoria de derrota en el modal de `GamePlayer`. Mismo criterio de no generalizar el HUD que aplicó Tetris (spec 07) al no agregar un campo `lines`.
- **Sí:** controles solo por teclado (`ArrowLeft`/`ArrowRight`); se elimina el control por mouse (`mousemove` sobre la paleta, `click` sobre botones de nivel) del original. Decisión explícita del usuario — consistencia con Asteroids/Tetris, evita mapear coordenadas de mouse sobre el canvas escalado dentro de `.crt-screen`.
- **Sí:** único control de pausa visible es el botón "PAUSA" del chasis; se elimina la tecla `P`/`Escape` y el overlay de pausa dibujado en canvas del original. Mismo criterio que Tetris/Asteroids.
- **Sí:** se conserva la función de saltar a un nivel específico, pero remapeada a las teclas `1`–`5`, activas solo mientras el juego está pausado vía el botón del chasis — no como overlay clicable en el canvas. Decisión explícita del usuario, motivada porque el overlay "EN PAUSA" propio de `GamePlayer.tsx` (z-index 5) taparía el overlay de canvas y bloquearía sus clics; se prefirió no tocar `GamePlayer.tsx` (archivo compartido por todos los juegos) para resolverlo.
- **Sí:** se elimina el overlay de fin de partida/victoria dibujado en canvas (`drawOverlay`) del original; se reutiliza el modal existente de `GamePlayer`, sin distinguir "GAME OVER" de victoria. Ningún juego real duplica esa UI (mismo criterio que Tetris).
- **Sí:** corregir `paddle.w` a `162` (ancho real del sprite `SPRITES.paddle`) en vez de replicar el `81` del original, que producía un sprite estirado/recortado respecto a su hitbox de colisión. Decisión explícita del usuario tras detectar la inconsistencia — bug del original, no se porta.
- **Sí:** reusar el id de catálogo existente `bloque-buster` (ARCADE, `cover-bricks`) para Arkanoid, en vez de crear un id nuevo. Ya calza en categoría y portada; evita CSS nuevo.
- **Sí:** el componente se llama `Arkanoid.tsx` (nombre del juego), no `BloqueBuster.tsx` (id de catálogo) — mismo criterio que `Asteroids.tsx`/`Tetris.tsx`.
- **Sí:** los sonidos se reproducen con `new Audio(...).cloneNode().play()` igual que el original, sin control de volumen/mute nuevo — fuera de alcance de este spec.
- **No:** agregar campos nuevos al contrato genérico `GameProps` (ni `lines`, ni un flag de victoria). El contrato de Asteroids/Tetris (`score`/`lives`/`level`) alcanza sin cambios.
- **No:** tocar `GamePlayer.tsx` para acomodar el selector de nivel — se resolvió remapeándolo a teclado en vez de modificar un archivo compartido por todos los juegos.
- **No:** controles táctiles/móviles en este spec. El juego de referencia es solo-teclado (tras la decisión anterior) y se replica tal cual.
- **No:** tocar `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx` más allá de lo ya existente.
- **No:** endurecer RLS ni introducir Auth real de Supabase en este spec. Sigue público, igual que Asteroids/Tetris.

## Risks

| Risk                                                                                                                                                 | Mitigación                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('bloque-buster', ...)` falla silenciosamente (`.catch(() => {})`) si la fila `games` no existe todavía                     | El plan aplica la migración (paso 9) antes de la prueba manual completa (paso 10), que es el primer momento en que se guarda un score real. |
| Assets estáticos (`spritesheet-breakout.png`, `.mp3`) no llegan al bundle o quedan con ruta incorrecta tras portarlos a `public/games/arkanoid/`     | Paso 1 incluye prueba manual explícita de que los archivos son accesibles vía `/games/arkanoid/...` antes de escribir el componente.        |
| `Audio.cloneNode().play()` en cada rebote/rotura puede lanzar una promesa rechazada en navegadores con autoplay restringido, sin afectar el gameplay | Comportamiento heredado del original, aceptado igual que en `references/started-games/04-arkanoid`; no se agrega manejo de error nuevo.     |
| Namespacing de assets bajo `public/games/<juego>/` es un patrón nuevo en el repo (Asteroids/Tetris no tienen assets propios)                         | Aceptado como precedente explícito para futuros juegos con assets — documentado en Decisiones, no requiere cambios a otros componentes.     |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de Arkanoid con el mismo nombre colisionan                                                      | No es un bloqueante (Asteroids/Tetris ya lo tienen); no se corrige en este spec.                                                            |
| `HallOfFameTable.tsx` tiene una fecha hardcodeada (`11/05/2026`) en su fila "tú"                                                                     | Bug preexistente, no introducido por este spec; no se corrige aquí.                                                                         |
| Remapear el selector de nivel a teclas `1`–`5` sin overlay visual propio deja la función sin indicación en pantalla de que existe                    | Aceptado — es una función secundaria heredada del original (debug/nivel-select), no crítica para el flujo normal de juego.                  |

## What is **not** in this spec

- Controles táctiles/móviles.
- Control por mouse de la paleta.
- Overlay de selección de nivel dibujado en canvas.
- Control de volumen/mute de los sonidos.
- Lógica real para los 4 juegos placeholder restantes del catálogo.
- Auth real de Supabase / RLS endurecido.
- Migración de `localStorage` `av_scores` antiguo.
- Cambios a `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

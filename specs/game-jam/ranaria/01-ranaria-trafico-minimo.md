# SPEC GAME JAM — RANARIA (Variante A: tráfico mínimo, un solo sistema)

> **Status:** Draft
> **Depends on:** 06-leaderboard-supabase, 07-tetris-real-registro
> **Date:** 2026-08-09
> **Tema:** Ranaria — juego tipo Frogger: cruzar carriles de tráfico/río. Puntuación: puntos por avance de fila + bonus por tiempo, acumulativo.
> **Variante:** A — alcance de mecánica **mínimo**: solo autopista (carriles de vehículos), sin río, sin plataformas móviles y sin nenúfares; la variante B añade la mitad de río con troncos/tortugas y 5 nenúfares a llenar.
> **Instancia:** jam-20260809-r7k
> **Objective:** Diseñar e implementar `Frogger.tsx`, un juego real de cruce de autopista (rana en grilla, carriles de vehículos con velocidades y direcciones distintas, reloj por intento) para el catálogo id `ranaria`, registrado en `REAL_GAMES` y con leaderboard real en Supabase igual que Asteroids/Tetris/Arkanoid/Snake.

## Scope

**In:**

- Componente `app/components/games/Frogger.tsx` (client component): juego diseñado desde cero (no existe carpeta en `references/started-games/` para Frogger — verificado por `Glob`), sobre un único `<canvas>` 800×600 (grilla de 16×12 celdas de 50px, aspect ratio 4:3 nativo, coincide con `.crt-screen`), siguiendo el patrón obligatorio ya establecido (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`).
- Render 100% vectorial en canvas 2D (rana, vehículos, asfalto, líneas de carril, aceras), sin assets externos y sin `public/games/ranaria/` — mismo criterio visual que `Asteroids.tsx`/`Tetris.tsx`. No hay estado interno `"loading"`: el juego arranca en el primer frame.
- Layout del tablero (filas 0 arriba → 11 abajo): fila 11 = acera de salida (segura), filas 10–1 = 10 carriles de tráfico, fila 0 = franja de meta (segura). No hay río, ni agua, ni plataformas móviles en esta variante.
- Carriles de tráfico: cada carril tiene dirección (`+1`/`-1`), velocidad propia en px/s y un patrón fijo de vehículos (ancho de 1 o 2 celdas, separación constante). Los vehículos se mueven de forma continua en píxeles y hacen wrap horizontal al salir del canvas (no se instancian/destruyen: es un anillo de posiciones).
- Movimiento de la rana: discreto, una celda por pulsación (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`), con animación de salto interpolada de ~90 ms sobre la posición de origen→destino. Se ignora el auto-repeat del teclado (`event.repeat`) para que mantener una tecla no dispare saltos encadenados. La rana no puede salir del tablero (movimientos fuera de rango se ignoran).
- Colisión: AABB entre el rectángulo de la rana (reducido a ~70% de la celda) y los vehículos del carril que ocupa; solo se evalúa cuando la rana está posada en una celda (no a mitad de salto) y solo contra el carril de su fila.
- Reloj por intento: 30 s por cruce. El HUD del chasis no tiene campo de tiempo, así que el reloj se dibuja como una barra decreciente dentro del canvas, en la franja inferior de la acera de salida. Agotarlo cuesta una vida igual que un atropello.
- Puntuación: `+10` por cada fila nueva alcanzada por encima de la fila más alta ya visitada en el intento actual (retroceder y volver a subir no vuelve a puntuar); `+50` al llegar a la fila 0 (meta); bonus de tiempo `= segundos restantes redondeados × 10` al completar el cruce.
- Ciclo de ronda: al llegar a la meta se suma el bonus, `level++`, la rana vuelve a la acera de salida, el reloj se reinicia a 30 s y la velocidad global de todos los carriles se multiplica por un factor fijo por nivel, con un techo para no volverse injugable.
- Vidas: 3 literales. Atropello o reloj agotado → `lives--`, la rana vuelve a la acera de salida y el reloj se reinicia; con 0 vidas → `onGameOver(score)` una sola vez.
- Registro `app/data/realGames.ts`: nueva entrada `ranaria: { component: Frogger }`.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `ranaria` para describir el juego real (carriles, reloj, bonus de tiempo, sin río); `id`, `cover: "cover-rana"`, `cat: "ARCADE"`, `color: "green"`, `best`, `plays` no cambian. No se toca `app/globals.css` (la clase `.cover-rana` ya existe — verificado por `Grep`).
- Tabla `games` en Supabase: nueva fila `id: "ranaria"` (mismo patrón SQL que las migraciones de specs 06/07/08/09), insertada antes de cualquier `insertScore('ranaria', ...)`.
- `/game/ranaria` (detalle, vía ruta genérica existente): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase.
- HUD: `lives` = contador real de vidas (3 → 0); `level` = número de ronda/cruce en curso (empieza en 1).
- Pausa unificada: el único control de pausa visible es el botón "PAUSA" del chasis (`GamePlayer`), sin overlay propio en canvas y sin tecla propia. `pause()` cancela el `requestAnimationFrame` y congela también el reloj del intento; `resume()` resetea `lastTime = null`.
- Fin de partida: sin overlay propio; al agotar la última vida (o vía `forceGameOver()`) se llama `onGameOver(score)` una sola vez y se reutiliza el modal existente de `GamePlayer`.

**Out of scope (para specs futuros):**

- Río, troncos, tortugas, plataformas móviles y nenúfares de destino (eso es la variante B de esta jam).
- Controles táctiles/móviles.
- Sonidos y sprites (el juego es 100% vectorial en esta variante).
- Insectos/bonus recolectables, cocodrilos, serpientes u otros enemigos no vehiculares.
- Lógica real para los 3 juegos placeholder restantes del catálogo (`gloton`, `invasores`, `duelo-pixel`).
- Auth real de Supabase / endurecer RLS (sigue público, igual que los otros juegos reales).
- Migrar entradas antiguas de `localStorage` `av_scores`.
- Campo de tiempo en el HUD del chasis (`GamePlayer.tsx` no se toca; el reloj vive dentro del canvas).
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
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
// app/components/games/Frogger.tsx
import type { GameHandle, GameProps } from "./types";

const Frogger = forwardRef<GameHandle, GameProps>(function Frogger(
  { onStateChange, onGameOver },
  ref,
) {
  // useEffect único: grid 16x12 (celda 50px)
  //                  / frog ({ col, row, fromCol, fromRow, hopT }) / lanes (array de carriles)
  //                  / highestRow (fila más alta alcanzada en el intento)
  //                  / timeLeft (segundos) / score / lives / level
  //                  / state ("playing" | "gameover")
  // reportState(): onStateChange({ score, lives, level });
  //                onGameOver(score) una sola vez al pasar a "gameover"
});
```

```ts
// Configuración de carriles embebida en Frogger.tsx (datos, sin estado propio)
interface Lane {
  row: number; // 1..10 (0 = meta, 11 = acera de salida)
  dir: 1 | -1;
  speed: number; // px/s a nivel 1
  carW: number; // ancho en celdas (1 o 2)
  gap: number; // separación entre vehículos, en celdas
  offset: number; // desplazamiento inicial en px, acumulado en el loop
  color: string; // color neón del vehículo (paleta cyan/magenta/yellow/green)
}
const LANES: Lane[] = [
  /* 10 entradas, filas 1..10, direcciones alternadas y velocidades crecientes hacia arriba */
];
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

Fila nueva en Supabase `games` (mismo esquema de `specs/06-leaderboard-supabase.md`, sin cambios de tabla; bloque ilustrativo, se aplica durante `/spec-impl`):

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

Convenciones internas (dentro del `useEffect`, no expuestas fuera del componente):

- Grilla: 16 columnas × 12 filas, celda de 50px, origen arriba-izquierda. Fila 0 = meta, filas 1–10 = carriles, fila 11 = acera de salida.
- Posición de la rana en `{col, row}` discretos + `hopT` (0→1) para interpolar el salto desde `{fromCol, fromRow}`; duración de salto ~90 ms.
- Vehículos: no se guardan como entidades; cada carril calcula sus rectángulos en el dibujo a partir de `offset`, `gap` y `carW`, con módulo sobre el ancho del anillo (`(carW + gap) * 50`). La colisión recorre esos mismos rectángulos.
- Velocidad efectiva de un carril = `lane.speed * levelFactor(level)`, con `levelFactor` creciente y acotado.
- `highestRow` se reinicia a 11 en cada intento (tras perder vida o completar cruce); avanzar a una fila `< highestRow` suma 10 puntos y actualiza `highestRow`.
- `timeLeft` se decrementa con el `dt` capado (`0.05`s) del loop; llega a 0 → misma penalización que un atropello.

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

## Implementation plan

1. Crear `app/components/games/Frogger.tsx`: estado grid/frog/lanes/timeLeft/score/lives/level dentro de un único `useEffect`, dibujando en un `<canvas>` 800×600 de forma 100% vectorial (acera de salida, franja de meta, asfalto con líneas de carril, vehículos como rectángulos redondeados neón, rana como cuerpo + patas + ojos). Aún sin `forwardRef` ni wiring — componente autocontenido, no montado en ningún lado todavía. Prueba manual: el canvas renderiza el tablero estático con la rana en la acera de salida.
2. Implementar el loop sobre `requestAnimationFrame` con `dt` capado a `0.05`s (mismo patrón que Asteroids/Snake): avanzar `offset` de cada carril según `speed * levelFactor(level) * dir * dt` con wrap por módulo, avanzar `hopT` del salto en curso, y decrementar `timeLeft`. Prueba manual: el tráfico circula fluido en las 10 filas, con direcciones alternadas y velocidades distintas, y la barra de tiempo baja.
3. Adaptar el input dentro del mismo `useEffect`: listeners en `window` con `preventDefault()` en `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` (cleanup en el `return`); se ignoran los eventos con `event.repeat` y los que ocurren mientras hay un salto en curso o el juego está pausado; se ignoran los movimientos que sacarían a la rana del tablero. Prueba manual: la rana salta una celda por pulsación; mantener la tecla no encadena saltos.
4. Implementar reglas de partida: colisión AABB rana↔vehículo del carril ocupado (solo con la rana posada, hitbox al ~70% de la celda) → perder vida; `timeLeft <= 0` → perder vida; llegar a la fila 0 → `+50` + bonus de tiempo (`segundos restantes × 10`), `level++`, reinicio de posición/reloj y aumento del factor de velocidad; avance a una fila nueva más alta → `+10`. Con `lives === 0` → `state = "gameover"`. Prueba manual: se puede completar un cruce, el score sube según lo descrito, y las 3 vidas se pierden por atropello y por reloj agotado.
5. Agregar `reportState()`: diffing manual de `score`/`lives`/`level` contra los últimos reportados antes de llamar a `onStateChange`; `onGameOver(score)` se dispara una sola vez al transitar a `"gameover"`, protegido por un flag `gameOverReported`.
6. Exponer `GameHandle` vía `forwardRef` + `useImperativeHandle` (`pause`/`resume`/`forceGameOver`) siguiendo el patrón `controlsRef` de Asteroids/Tetris/Arkanoid/Snake; `pause()` cancela el rAF y congela el reloj del intento, `resume()` resetea `lastTime = null`.
7. Agregar `Frogger` a `app/data/realGames.ts` bajo la clave `"ranaria"`. Prueba manual: `GamePlayer` (sin cambios propios) ya renderiza el canvas real al entrar a `/game/ranaria/play`, con HUD, PAUSA/FIN y modal de fin de partida funcionando igual que los otros juegos reales.
8. Actualizar `app/data/games.ts`: reescribir `short`/`long` de la entrada `ranaria` para reflejar el juego real (10 carriles, 3 vidas, reloj de 30 s, bonus de tiempo), sin mencionar río ni nenúfares. Prueba manual: `/games` y `/game/ranaria` muestran los textos nuevos.
9. Escribir y aplicar la migración SQL (`insert into games ...` para `id: 'ranaria'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.
10. Prueba manual completa: jugar una partida en `/game/ranaria/play` (saltar en las 4 direcciones, verificar que retroceder no vuelve a puntuar, ser atropellado, agotar el reloj, completar al menos dos cruces y notar la aceleración por nivel, pausar/reanudar con el botón del chasis confirmando que el reloj también se congela, "FIN", y game over real al perder las 3 vidas); guardar puntuación y confirmar que aparece en `/game/ranaria` y en el tab RANARIA del Salón de la Fama; confirmar que Asteroids, Tetris, Arkanoid, Snake y el resto del catálogo no sufrieron regresión.

## Acceptance criteria

- [ ] `/game/ranaria/play` monta el canvas real de RANARIA (800×600, grilla 16×12, render vectorial) en vez de la simulación CSS (`.game-arena`).
- [ ] Las 4 flechas mueven la rana una celda por pulsación, con animación de salto; mantener una tecla presionada no encadena saltos y no se puede salir del tablero.
- [ ] Los 10 carriles muestran vehículos con direcciones alternadas y velocidades distintas, con wrap horizontal continuo y sin parpadeos al reaparecer.
- [ ] Ser atropellado resta una vida y devuelve la rana a la acera de salida con el reloj reiniciado.
- [ ] Agotar el reloj de 30 s resta una vida de la misma forma; la barra de tiempo se dibuja dentro del canvas y baja de forma visible.
- [ ] Alcanzar una fila nueva más alta que la máxima del intento suma 10 puntos; retroceder y volver a subir no vuelve a sumar.
- [ ] Llegar a la fila de meta suma 50 puntos más el bonus de tiempo (segundos restantes × 10), sube el `level` y acelera todos los carriles.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real, reflejando vidas reales (3 → 0) y el número de cruce en curso.
- [ ] Pulsar "PAUSA" congela el tráfico, la rana y el reloj del intento; "REANUDAR" lo retoma exactamente donde quedó, sin un salto de tiempo acumulado.
- [ ] Pulsar "FIN" fuerza game over inmediato y abre el modal existente de `GamePlayer` con el score real acumulado.
- [ ] Perder la última vida dispara `onGameOver(score)` una sola vez y abre el mismo modal, sin overlay propio dibujado en el canvas.
- [ ] Guardar la puntuación en el modal inserta una fila en Supabase `scores` (`game_id: "ranaria"`, `name`, `score`).
- [ ] Las teclas de flecha no hacen scroll de la página mientras se juega RANARIA.
- [ ] `/game/ranaria` muestra `short`/`long` actualizados describiendo el juego real, leaderboard real desde Supabase, y "Partidas"/"Mejor global" calculados desde `scores` (0 en ambos si la tabla está vacía para ese id).
- [ ] El tab RANARIA de `/hall-of-fame` muestra podio + tabla con datos reales de Supabase, con el mismo manejo de <3 filas que ya tienen los otros juegos reales.
- [ ] Los 3 juegos placeholder restantes (`gloton`, `invasores`, `duelo-pixel`) siguen mostrando la simulación visual sin cambios, sin regresión.
- [ ] `/game/asteroids/play`, `/game/caida/play`, `/game/bloque-buster/play` y `/game/serpentina/play` siguen funcionando exactamente igual que antes.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/ranaria`, `/game/ranaria/play` y `/hall-of-fame`.

## Decisions

- **Sí:** reusar el id de catálogo existente `ranaria` (ARCADE, `cover-rana`, verde) en vez de crear un id nuevo — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger: cruzar carriles de tráfico/río"). El placeholder ya calza en categoría, portada y color; evita CSS nuevo y una entrada nueva en `GAMES`, mismo criterio que `caida`→Tetris, `bloque-buster`→Arkanoid y `serpentina`→Snake.
- **Sí:** eje de variante = **alcance de mecánica** (A mínimo / B ampliado) en vez del eje por defecto render/assets — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Motivo verificado: `Glob` sobre `references/started-games/*` y `references/source-assets/*` no encontró ninguna fuente de Frogger ni assets plausibles (solo existen los de Asteroids, Tetris, Arkanoid y el atlas de frutas ya usado por Snake), así que una variante "con spritesheet porteado" no tendría de dónde portar.
- **Sí:** esta variante A cubre **solo la autopista** (un único sistema: carriles de vehículos con velocidad y dirección propias), sin río, plataformas móviles ni nenúfares — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Reduce el tuning al mínimo señalado en el tema ("carriles con velocidades/objetos distintos requieren más tuning que un solo sistema de físicas").
- **Sí:** `lives` se reporta con el contador real de vidas (3 → 0) y `level` con el número de cruce/ronda en curso — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). El juego tiene vidas literales, así que no hace falta el remapeo a `lives: 1` que usaron Tetris y Snake.
- **Sí:** canvas 800×600 nativo (grilla 16×12 de celdas de 50px) llenando `.crt-screen` sin letterbox, igual que Arkanoid y Snake — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); el juego es horizontal, no vertical como Tetris.
- **Sí:** el reloj del intento se dibuja como barra dentro del canvas, no como campo nuevo del HUD — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Evita tocar `GamePlayer.tsx`, archivo compartido por todos los juegos, y no extiende el contrato `GameProps`.
- **Sí:** bonus de tiempo al completar un cruce = segundos restantes × 10, sumado al `+50` del cruce y a los `+10` por fila nueva — decisión del agente game-jam (tema: "puntuación: puntos por avance de fila + bonus por tiempo, acumulativo"). El score resultante es entero, acumulativo y monótono, apto para `insertScore`/`getTopScores` sin normalizar.
- **Sí:** el crédito de `+10` por fila usa una marca de agua (`highestRow`) por intento, para que subir y bajar repetidamente no permita farmear puntos — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger").
- **Sí:** se ignora el auto-repeat del teclado (`event.repeat`) y las pulsaciones durante un salto en curso — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); mantiene el movimiento discreto legible, análogo al filtro de inversión 180° de Snake.
- **Sí:** el loop es `requestAnimationFrame` con `dt` capado a `0.05`s, nunca `setInterval` — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); mismo patrón de pausa/resume (`cancelAnimationFrame` / `lastTime = null`) que el resto del catálogo, con el reloj del intento consumiendo el mismo `dt`.
- **Sí:** único control de pausa visible es el botón "PAUSA" del chasis; no hay tecla de pausa propia ni overlay propio en canvas — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"), mismo criterio que specs 07/08/09.
- **Sí:** no hay overlay propio de fin de partida; se reutiliza el modal existente de `GamePlayer` — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Ningún juego real duplica esa UI.
- **Sí:** el componente se llama `Frogger.tsx` (nombre del juego), no `Ranaria.tsx` (id de catálogo) — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"), mismo criterio que `Asteroids.tsx`/`Tetris.tsx`/`Arkanoid.tsx`/`Snake.tsx`.
- **No:** río, troncos, tortugas ni nenúfares en esta variante — es exactamente lo que la separa de la variante B; añadirlos aquí borraría el eje de comparación.
- **No:** assets en `public/games/ranaria/` ni sonidos. Render 100% vectorial, sin estado interno `"loading"`.
- **No:** controles táctiles/móviles.
- **No:** tocar `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx` más allá de lo ya existente — `REAL_GAMES` ya generaliza la integración de un juego nuevo.
- **No:** endurecer RLS ni introducir Auth real de Supabase. Sigue público, igual que los otros juegos reales.

## Risks

| Risk                                                                                                                                                                   | Mitigación                                                                                                                                                                                                             |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('ranaria', ...)` falla en silencio (`GamePlayer.saveScore()` traga el error con `.catch(() => {})`) si la fila de `games` no existe todavía  | El plan aplica la migración (paso 9) antes de la prueba manual completa (paso 10), que es el primer momento en que se guarda un score real.                                                                            |
| 10 carriles con velocidad y dirección propias exigen tuning para que el cruce sea posible pero no trivial (riesgo señalado en el propio tema)                          | Los carriles son datos declarativos (`LANES`) separados de la lógica: ajustar `speed`/`gap`/`carW` es cambiar una tabla, no el loop. El paso 4 incluye prueba manual explícita de que un cruce completo es alcanzable. |
| Movimiento discreto de la rana contra tráfico continuo puede producir "muertes injustas" si la colisión se evalúa a mitad de salto                                     | Se decide explícitamente evaluar colisión solo con la rana posada, con hitbox al ~70% de la celda; documentado en Scope y verificado en el paso 4.                                                                     |
| Con `dt` capado a `0.05`s, una pestaña en segundo plano hace avanzar el tráfico más lento que el tiempo real y el reloj del intento se desincroniza del reloj de pared | Aceptado y coherente: el reloj del intento consume el mismo `dt` capado que el tráfico, así que juego y reloj siempre están en la misma base de tiempo.                                                                |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de RANARIA con el mismo nombre colisionan                                                                         | No es un bloqueante (los otros juegos reales ya lo tienen); no se corrige en este spec.                                                                                                                                |
| `HallOfFameTable.tsx` tiene una fecha hardcodeada (`11/05/2026`) en su fila "tú"                                                                                       | Bug preexistente, no introducido por este spec; no se corrige aquí.                                                                                                                                                    |
| El reloj dentro del canvas puede pasar desapercibido al estar fuera del HUD del chasis                                                                                 | Se dibuja como barra ancha en la franja inferior con color de alerta al bajar de 10 s; aceptado como coste de no tocar `GamePlayer.tsx`.                                                                               |

## What is **not** in this spec

- Río, troncos, tortugas, plataformas móviles y nenúfares de destino.
- Insectos/bonus recolectables y enemigos no vehiculares.
- Controles táctiles/móviles.
- Sprites y sonidos en `public/games/ranaria/`.
- Campo de tiempo en el HUD del chasis / cambios a `GamePlayer.tsx`.
- Lógica real para los 3 juegos placeholder restantes del catálogo.
- Auth real de Supabase / RLS endurecido.
- Migración de `localStorage` `av_scores` antiguo.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

---

**Nota:** esta variante A y la variante B (`02-ranaria-rio-y-nenufares.md`) son **mutuamente excluyentes** — ambas ocupan el id de catálogo `ranaria`, la misma entrada de `REAL_GAMES` y la misma fila de Supabase. Implementar una deja la otra obsoleta.

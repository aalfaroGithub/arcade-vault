# SPEC GAME JAM — RANARIA (Variante B: autopista + río y nenúfares)

> **Status:** Draft
> **Depends on:** 06-leaderboard-supabase, 07-tetris-real-registro
> **Date:** 2026-08-09
> **Tema:** Ranaria — juego tipo Frogger: cruzar carriles de tráfico/río. Puntuación: puntos por avance de fila + bonus por tiempo, acumulativo.
> **Variante:** B — alcance de mecánica **ampliado**: dos mitades de tablero (autopista letal + río con plataformas móviles sobre las que la rana viaja) y 5 nenúfares que hay que llenar para completar el nivel; la variante A se queda solo en la autopista.
> **Objective:** Diseñar e implementar `Frogger.tsx`, un juego real de Frogger completo (autopista de vehículos, río con troncos y tortugas que se sumergen, 5 nenúfares de destino, reloj por intento) para el catálogo id `ranaria`, registrado en `REAL_GAMES` y con leaderboard real en Supabase igual que Asteroids/Tetris/Arkanoid/Snake.
> **Instancia:** jam-20260809-r7k

## Scope

**In:**

- Componente `app/components/games/Frogger.tsx` (client component): juego diseñado desde cero (no existe carpeta en `references/started-games/` para Frogger — verificado por `Glob`), sobre un único `<canvas>` 800×600 (grilla de 16×12 celdas de 50px, aspect ratio 4:3 nativo, coincide con `.crt-screen`), siguiendo el patrón obligatorio ya establecido (estado mutable dentro de un único `useEffect`, `reportState()` con diffing, `controlsRef` + `useImperativeHandle`, listeners en `window` con `preventDefault()`).
- Render 100% vectorial en canvas 2D (rana, vehículos, troncos, tortugas, agua, asfalto, nenúfares), sin assets externos y sin `public/games/ranaria/` — mismo criterio visual que `Asteroids.tsx`/`Tetris.tsx`. No hay estado interno `"loading"`: el juego arranca en el primer frame.
- Layout del tablero (filas 0 arriba → 11 abajo), con **dos sistemas distintos**:
  - Fila 11: acera de salida (segura).
  - Filas 10–6: **autopista**, 5 carriles de vehículos con dirección y velocidad propias. Tocar un vehículo mata.
  - Fila 5: mediana segura (isla central).
  - Filas 4–1: **río**, 4 carriles de plataformas móviles (troncos de 2–3 celdas y grupos de 3 tortugas). Estar en una fila de río **sin** plataforma bajo la rana mata (ahogamiento); estando sobre una plataforma, la rana se desplaza con ella y muere si la plataforma la arrastra fuera del canvas.
  - Fila 0: **orilla de nenúfares** — 5 nenúfares equiespaciados sobre franja sólida; el resto de la fila 0 es muro (llegar a fila 0 fuera de un nenúfar mata).
- Tortugas que se sumergen: uno de los carriles de tortugas alterna un ciclo emergida/sumergida por grupo (fase desfasada por grupo); mientras está sumergida no cuenta como plataforma y la rana se ahoga si sigue encima.
- Movimiento de la rana: discreto, una celda por pulsación (`ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight`), con animación de salto interpolada de ~90 ms. Se ignora el auto-repeat del teclado (`event.repeat`) y las pulsaciones durante un salto en curso. La rana no puede salir del tablero por su propio salto (los movimientos fuera de rango se ignoran); sí puede ser arrastrada fuera por un tronco, lo cual mata.
- Colisión: AABB entre el rectángulo de la rana (reducido a ~70% de la celda) y los vehículos, evaluada solo con la rana posada. En el río, la comprobación es de _soporte_: se busca la plataforma activa que contiene el centro de la rana; si no hay, ahogamiento.
- Reloj por intento: 30 s por rana. El HUD del chasis no tiene campo de tiempo, así que el reloj se dibuja como barra decreciente dentro del canvas, en la franja inferior de la acera de salida. Agotarlo cuesta una vida.
- Nenúfares: 5 slots por nivel. Ocupar uno lo marca como lleno (queda dibujada una rana posada), suma puntos, devuelve la rana a la acera de salida y reinicia el reloj. Un nenúfar ya lleno se comporta como muro (no se puede volver a ocupar).
- Puntuación: `+10` por cada fila nueva alcanzada por encima de la fila más alta ya visitada en el intento actual; `+200` al llenar un nenúfar; bonus de tiempo `= segundos restantes redondeados × 10` al llenar cada nenúfar; `+1000` al llenar los 5 nenúfares (nivel completado).
- Ciclo de nivel: al llenar los 5 nenúfares se suma el `+1000`, `level++`, los nenúfares se vacían y la velocidad global de todos los carriles (autopista y río) se multiplica por un factor fijo por nivel, con techo. Desde el nivel 3 el carril de tortugas sumergibles acorta su ciclo de emersión.
- Vidas: 3 literales. Atropello, ahogamiento, arrastre fuera del canvas, chocar contra el muro de la fila 0 o reloj agotado → `lives--`, la rana vuelve a la acera de salida y el reloj se reinicia; con 0 vidas → `onGameOver(score)` una sola vez.
- Registro `app/data/realGames.ts`: nueva entrada `ranaria: { component: Frogger }`.
- `app/data/games.ts`: se reescriben `short`/`long` de la entrada `ranaria` para describir el juego real (autopista, río, nenúfares, reloj); `id`, `cover: "cover-rana"`, `cat: "ARCADE"`, `color: "green"`, `best`, `plays` no cambian. No se toca `app/globals.css` (la clase `.cover-rana` ya existe — verificado por `Grep`).
- Tabla `games` en Supabase: nueva fila `id: "ranaria"` (mismo patrón SQL que las migraciones de specs 06/07/08/09), insertada antes de cualquier `insertScore('ranaria', ...)`.
- `/game/ranaria` (detalle, vía ruta genérica existente): leaderboard y stat-strip (`Partidas`/`Mejor global`) reales desde Supabase.
- HUD: `lives` = contador real de vidas (3 → 0); `level` = número de nivel (tanda de 5 nenúfares) en curso, empieza en 1. Los nenúfares llenos se ven en el canvas, no en el HUD.
- Pausa unificada: el único control de pausa visible es el botón "PAUSA" del chasis (`GamePlayer`), sin overlay propio en canvas y sin tecla propia. `pause()` cancela el `requestAnimationFrame` y congela el reloj del intento y el ciclo de las tortugas; `resume()` resetea `lastTime = null`.
- Fin de partida: sin overlay propio; al agotar la última vida (o vía `forceGameOver()`) se llama `onGameOver(score)` una sola vez y se reutiliza el modal existente de `GamePlayer`.

**Out of scope (para specs futuros):**

- Controles táctiles/móviles.
- Sonidos y sprites (el juego es 100% vectorial en esta variante).
- Insecto/mosca bonus sobre un nenúfar, cocodrilos, serpientes y rana rescatable — enemigos y bonus adicionales del Frogger original que no entran aquí.
- Lógica real para los 3 juegos placeholder restantes del catálogo (`gloton`, `invasores`, `duelo-pixel`).
- Auth real de Supabase / endurecer RLS (sigue público, igual que los otros juegos reales).
- Migrar entradas antiguas de `localStorage` `av_scores`.
- Campo de tiempo o indicador de nenúfares en el HUD del chasis (`GamePlayer.tsx` no se toca; ambos viven dentro del canvas).
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
  //                  / frog ({ x (px, continuo), row, fromX, fromRow, hopT, ridingLane })
  //                  / roadLanes (filas 10..6) / riverLanes (filas 4..1) / turtleCycleT
  //                  / lilypads (5 slots boolean) / highestRow / timeLeft
  //                  / score / lives / level / state ("playing" | "gameover")
  // reportState(): onStateChange({ score, lives, level });
  //                onGameOver(score) una sola vez al pasar a "gameover"
});
```

```ts
// Configuración de carriles embebida en Frogger.tsx (datos, sin estado propio)
interface RoadLane {
  row: number; // 10..6
  dir: 1 | -1;
  speed: number; // px/s a nivel 1
  carW: number; // ancho en celdas (1 o 2)
  gap: number; // separación entre vehículos, en celdas
  offset: number; // desplazamiento acumulado en px
  color: string;
}

interface RiverLane {
  row: number; // 4..1
  kind: "log" | "turtles";
  dir: 1 | -1;
  speed: number; // px/s a nivel 1
  platW: number; // ancho en celdas (2..3 para troncos, 3 para grupos de tortugas)
  gap: number;
  offset: number;
  sinkable: boolean; // solo para kind === "turtles"
  sinkPhase: number; // desfase del ciclo emergida/sumergida, 0..1
}

const ROAD_LANES: RoadLane[] = [/* 5 entradas, filas 10..6 */];
const RIVER_LANES: RiverLane[] = [
  /* 4 entradas, filas 4..1; al menos una con kind "turtles" y sinkable true */
];
const LILYPAD_COLS = [1, 4, 7, 10, 13]; // columnas de los 5 nenúfares en la fila 0
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

- Grilla: 16 columnas × 12 filas, celda de 50px, origen arriba-izquierda. Fila 0 = orilla de nenúfares, filas 1–4 = río, fila 5 = mediana, filas 6–10 = autopista, fila 11 = acera de salida.
- La rana guarda `x` en **píxeles continuos** (no en columnas) porque sobre un tronco se desplaza fracciones de celda; `row` sigue siendo discreto. Al saltar, el destino se calcula como `round(x / 50) ± 1` columnas, re-encajado (`snap`) al centro de celda.
- Plataformas y vehículos: no se guardan como entidades; cada carril calcula sus rectángulos en el dibujo a partir de `offset`, `gap` y `platW`/`carW`, con módulo sobre el ancho del anillo (`(platW + gap) * 50`). Colisión y soporte recorren esos mismos rectángulos.
- Ciclo de tortugas: `turtleCycleT` avanza con el `dt` del loop; un grupo está sumergido cuando `frac(turtleCycleT + sinkPhase)` cae en la ventana de inmersión (≈30% del ciclo). En un carril `sinkable`, un grupo sumergido no aporta soporte.
- Velocidad efectiva = `lane.speed * levelFactor(level)`, con `levelFactor` creciente y acotado, aplicado por igual a autopista y río.
- `highestRow` se reinicia a 11 en cada intento; avanzar a una fila `< highestRow` suma 10 puntos y actualiza `highestRow`.
- `timeLeft` se decrementa con el `dt` capado (`0.05`s) del loop; llega a 0 → misma penalización que morir.
- Muerte: función única `loseLife(cause)` que decrementa vidas, reposiciona la rana, reinicia `timeLeft` y `highestRow`, y decide `state = "gameover"` cuando `lives === 0`. Las causas (atropello, ahogamiento, arrastre, muro) comparten el mismo camino.

No se agregan columnas ni tablas nuevas — `games`/`scores` ya soportan cualquier `game_id` de texto.

## Implementation plan

1. Crear `app/components/games/Frogger.tsx`: estado grid/frog/roadLanes/riverLanes/lilypads/timeLeft/score/lives/level dentro de un único `useEffect`, dibujando en un `<canvas>` 800×600 de forma 100% vectorial (acera, autopista con líneas de carril, mediana, río, orilla con 5 nenúfares, vehículos, troncos, tortugas, rana). Aún sin `forwardRef` ni wiring — componente autocontenido, no montado en ningún lado todavía. Prueba manual: el canvas renderiza el tablero estático completo con la rana en la acera de salida y los 5 nenúfares vacíos.
2. Implementar el loop sobre `requestAnimationFrame` con `dt` capado a `0.05`s (mismo patrón que Asteroids/Snake): avanzar `offset` de cada carril de autopista y de río según `speed * levelFactor(level) * dir * dt` con wrap por módulo, avanzar `turtleCycleT`, avanzar `hopT` del salto en curso, y decrementar `timeLeft`. Prueba manual: vehículos, troncos y tortugas circulan fluido; las tortugas sumergibles se sumergen y emergen con fases distintas; la barra de tiempo baja.
3. Adaptar el input dentro del mismo `useEffect`: listeners en `window` con `preventDefault()` en `ArrowUp`/`ArrowDown`/`ArrowLeft`/`ArrowRight` (cleanup en el `return`); se ignoran los eventos con `event.repeat`, los que ocurren durante un salto en curso o en pausa, y los que sacarían a la rana del tablero. El salto parte de `round(x / 50)` para que funcionar sobre un tronco no descuadre la columna destino. Prueba manual: la rana salta una celda por pulsación, incluso viajando sobre un tronco.
4. Implementar el sistema de **autopista** (filas 10–6): colisión AABB rana↔vehículo del carril ocupado (rana posada, hitbox al ~70% de la celda) → `loseLife("atropello")`. Prueba manual: se puede cruzar los 5 carriles hasta la mediana y ser atropellado en cada uno.
5. Implementar el sistema de **río** (filas 1–4): al posarse o permanecer en una fila de río se busca la plataforma activa que soporta el centro de la rana; si existe, `frog.x += platSpeed * dir * dt` (la rana viaja con la plataforma); si no existe (o la tortuga bajo ella está sumergida) → `loseLife("ahogamiento")`; si el arrastre saca a la rana del canvas → `loseLife("arrastre")`. Prueba manual: se puede montar un tronco y viajar con él, saltar de tronco a tronco, ahogarse al caer al agua, ahogarse al quedarse en una tortuga que se sumerge, y morir arrastrado fuera del borde.
6. Implementar la **orilla de nenúfares** (fila 0): saltar a la columna de un nenúfar vacío → `+200` + bonus de tiempo (`segundos restantes × 10`), se marca el slot como lleno, la rana vuelve a la acera y el reloj se reinicia; saltar a un nenúfar ya lleno o a cualquier otra celda de la fila 0 → `loseLife("muro")`. Al llenar los 5 → `+1000`, `level++`, slots vacíos y aumento del factor de velocidad global. Prueba manual: se completa un nivel entero de 5 nenúfares y se ve el aumento de velocidad en la siguiente tanda.
7. Añadir el crédito de `+10` por fila nueva vía la marca de agua `highestRow` (reiniciada en cada intento), el reloj de 30 s con penalización de vida al llegar a 0, y el paso a `state = "gameover"` cuando `lives === 0`. Prueba manual: retroceder y volver a subir no vuelve a puntuar; agotar el reloj cuesta una vida; perder las 3 vidas termina la partida.
8. Agregar `reportState()`: diffing manual de `score`/`lives`/`level` contra los últimos reportados antes de llamar a `onStateChange`; `onGameOver(score)` se dispara una sola vez al transitar a `"gameover"`, protegido por un flag `gameOverReported`.
9. Exponer `GameHandle` vía `forwardRef` + `useImperativeHandle` (`pause`/`resume`/`forceGameOver`) siguiendo el patrón `controlsRef` de Asteroids/Tetris/Arkanoid/Snake; `pause()` cancela el rAF y congela reloj y ciclo de tortugas, `resume()` resetea `lastTime = null`.
10. Agregar `Frogger` a `app/data/realGames.ts` bajo la clave `"ranaria"`. Prueba manual: `GamePlayer` (sin cambios propios) ya renderiza el canvas real al entrar a `/game/ranaria/play`, con HUD, PAUSA/FIN y modal de fin de partida funcionando igual que los otros juegos reales.
11. Actualizar `app/data/games.ts`: reescribir `short`/`long` de la entrada `ranaria` para reflejar el juego real (autopista de 5 carriles, río con troncos y tortugas, 5 nenúfares, 3 vidas, reloj de 30 s). Prueba manual: `/games` y `/game/ranaria` muestran los textos nuevos.
12. Escribir y aplicar la migración SQL (`insert into games ...` para `id: 'ranaria'`, mismos valores que el registro actualizado en `games.ts`) contra Supabase, confirmando antes que no exista ya una fila con ese id.
13. Prueba manual completa: jugar una partida en `/game/ranaria/play` (cruzar la autopista, montar troncos, sobrevivir a las tortugas sumergibles, llenar los 5 nenúfares y pasar de nivel notando la aceleración, morir por atropello, ahogamiento, arrastre, muro de la orilla y reloj agotado, pausar/reanudar con el botón del chasis confirmando que el reloj y el ciclo de tortugas también se congelan, "FIN", y game over real al perder las 3 vidas); guardar puntuación y confirmar que aparece en `/game/ranaria` y en el tab RANARIA del Salón de la Fama; confirmar que Asteroids, Tetris, Arkanoid, Snake y el resto del catálogo no sufrieron regresión.

## Acceptance criteria

- [ ] `/game/ranaria/play` monta el canvas real de RANARIA (800×600, grilla 16×12, render vectorial) en vez de la simulación CSS (`.game-arena`).
- [ ] Las 4 flechas mueven la rana una celda por pulsación, con animación de salto; mantener una tecla presionada no encadena saltos y la rana no puede salir del tablero por su propio salto.
- [ ] Los 5 carriles de autopista muestran vehículos con direcciones alternadas y velocidades distintas, con wrap horizontal continuo; tocar uno resta una vida.
- [ ] La fila 5 (mediana) es segura y permite detenerse entre la autopista y el río.
- [ ] Los 4 carriles de río muestran troncos y grupos de tortugas en movimiento; posarse sobre uno hace que la rana viaje con la plataforma.
- [ ] Caer al agua (fila de río sin plataforma bajo la rana) resta una vida por ahogamiento.
- [ ] Las tortugas del carril sumergible se sumergen y emergen cíclicamente con fases desfasadas entre grupos; quedarse sobre un grupo sumergido resta una vida.
- [ ] Ser arrastrado fuera del borde del canvas por una plataforma resta una vida.
- [ ] Llenar un nenúfar vacío suma 200 puntos más el bonus de tiempo (segundos restantes × 10), lo marca como ocupado y devuelve la rana a la acera con el reloj reiniciado.
- [ ] Saltar a un nenúfar ya lleno o a la franja sólida de la fila 0 resta una vida.
- [ ] Llenar los 5 nenúfares suma 1000 puntos, sube el `level`, vacía los nenúfares y acelera todos los carriles de autopista y río.
- [ ] Alcanzar una fila nueva más alta que la máxima del intento suma 10 puntos; retroceder y volver a subir no vuelve a sumar.
- [ ] Agotar el reloj de 30 s resta una vida; la barra de tiempo se dibuja dentro del canvas y baja de forma visible.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en tiempo real, reflejando vidas reales (3 → 0) y el nivel en curso.
- [ ] Pulsar "PAUSA" congela tráfico, río, rana, reloj y ciclo de tortugas; "REANUDAR" lo retoma exactamente donde quedó, sin un salto de tiempo acumulado.
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
- **Sí:** esta variante B implementa **los dos sistemas** del Frogger clásico (autopista letal + río con plataformas que transportan) más los 5 nenúfares de destino y las tortugas sumergibles — decisión del agente game-jam (tema: "cruzar carriles de tráfico/río"). Es la lectura literal del tema y da uso real al campo `level` del HUD (una tanda de 5 nenúfares por nivel).
- **Sí:** en el río la rana guarda su `x` en píxeles continuos y hace `snap` a columna al saltar — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Es la única forma de que viajar sobre un tronco no desalinee la grilla; es la diferencia estructural principal respecto a Snake, que es puramente discreto.
- **Sí:** `lives` se reporta con el contador real de vidas (3 → 0) y `level` con el número de tanda de 5 nenúfares — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). El juego tiene vidas literales, así que no hace falta el remapeo a `lives: 1` que usaron Tetris y Snake.
- **Sí:** canvas 800×600 nativo (grilla 16×12 de celdas de 50px) llenando `.crt-screen` sin letterbox, igual que Arkanoid y Snake — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); el juego es horizontal, no vertical como Tetris.
- **Sí:** el reloj del intento y el estado de los 5 nenúfares se dibujan dentro del canvas, no como campos nuevos del HUD — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Evita tocar `GamePlayer.tsx`, archivo compartido por todos los juegos, y no extiende el contrato `GameProps`.
- **Sí:** puntuación `+10` por fila nueva, `+200` por nenúfar, bonus de tiempo `segundos × 10` por nenúfar y `+1000` por tanda completa — decisión del agente game-jam (tema: "puntuación: puntos por avance de fila + bonus por tiempo, acumulativo"). El score resultante es entero, acumulativo y monótono, apto para `insertScore`/`getTopScores` sin normalizar.
- **Sí:** el crédito de `+10` por fila usa una marca de agua (`highestRow`) por intento, para que subir y bajar repetidamente no permita farmear puntos — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger").
- **Sí:** todas las causas de muerte (atropello, ahogamiento, arrastre fuera del canvas, muro de la orilla, reloj agotado) comparten una única función `loseLife(cause)` — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); evita cinco caminos divergentes de reset y garantiza que `onGameOver` se dispare una sola vez.
- **Sí:** se ignora el auto-repeat del teclado (`event.repeat`) y las pulsaciones durante un salto en curso — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); mantiene el movimiento discreto legible, análogo al filtro de inversión 180° de Snake.
- **Sí:** el loop es `requestAnimationFrame` con `dt` capado a `0.05`s, nunca `setInterval` — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); mismo patrón de pausa/resume (`cancelAnimationFrame` / `lastTime = null`) que el resto del catálogo, con el reloj del intento y el ciclo de tortugas consumiendo el mismo `dt`.
- **Sí:** único control de pausa visible es el botón "PAUSA" del chasis; no hay tecla de pausa propia ni overlay propio en canvas — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"), mismo criterio que specs 07/08/09.
- **Sí:** no hay overlay propio de fin de partida; se reutiliza el modal existente de `GamePlayer` — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"). Ningún juego real duplica esa UI.
- **Sí:** el componente se llama `Frogger.tsx` (nombre del juego), no `Ranaria.tsx` (id de catálogo) — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"), mismo criterio que `Asteroids.tsx`/`Tetris.tsx`/`Arkanoid.tsx`/`Snake.tsx`.
- **No:** mosca bonus, cocodrilos, serpientes ni rana rescatable del Frogger original — decisión del agente game-jam (tema: "Ranaria — juego tipo Frogger"); el alcance ampliado se corta en los dos sistemas base + tortugas sumergibles, para no volver el tuning inabordable.
- **No:** assets en `public/games/ranaria/` ni sonidos. Render 100% vectorial, sin estado interno `"loading"`.
- **No:** controles táctiles/móviles.
- **No:** tocar `GamePlayer.tsx`, `Leaderboard.tsx`, `HallOfFamePodium.tsx` o `HallOfFameTable.tsx` más allá de lo ya existente — `REAL_GAMES` ya generaliza la integración de un juego nuevo.
- **No:** endurecer RLS ni introducir Auth real de Supabase. Sigue público, igual que los otros juegos reales.

## Risks

| Risk                                                                                                                                                                        | Mitigación                                                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FK ordering: `insertScore('ranaria', ...)` falla en silencio (`GamePlayer.saveScore()` traga el error con `.catch(() => {})`) si la fila de `games` no existe todavía       | El plan aplica la migración (paso 12) antes de la prueba manual completa (paso 13), que es el primer momento en que se guarda un score real.                                                                                                          |
| Dos sistemas distintos (autopista letal por contacto vs. río letal por ausencia de contacto) duplican la superficie de tuning y de bugs — riesgo señalado en el propio tema | Los dos sistemas se implementan en pasos separados con prueba manual propia (4 y 5), y todos los carriles son datos declarativos (`ROAD_LANES`/`RIVER_LANES`) separados de la lógica: ajustar `speed`/`gap`/`platW` es cambiar una tabla, no el loop. |
| La rana con `x` continuo sobre plataformas puede acumular error de redondeo y quedar desalineada de la grilla tras varios saltos                                            | El salto siempre re-encaja el destino con `round(x / 50)` y hace `snap` al centro de celda; documentado en Convenciones internas y verificado en el paso 3.                                                                                           |
| El soporte en el río depende de rectángulos calculados por módulo cada frame; un error de fase deja "agujeros" invisibles donde la rana se ahoga sin razón aparente         | La misma función que dibuja las plataformas es la que calcula el soporte (una única fuente de posiciones), de modo que lo que se ve es exactamente lo que colisiona.                                                                                  |
| Las tortugas sumergibles pueden producir muertes que el jugador percibe como injustas si no hay aviso visual de la inmersión                                                | El ciclo dibuja un estado intermedio (tortuga a medio sumergir) antes de dejar de aportar soporte; el soporte solo desaparece en la fase totalmente sumergida.                                                                                        |
| Con `dt` capado a `0.05`s, una pestaña en segundo plano hace avanzar el mundo más lento que el tiempo real y el reloj del intento se desincroniza del reloj de pared        | Aceptado y coherente: reloj, tráfico, río y ciclo de tortugas consumen el mismo `dt` capado, así que todo el juego está en la misma base de tiempo.                                                                                                   |
| `Leaderboard.tsx` usa `key={r.name}` — dos jugadores de RANARIA con el mismo nombre colisionan                                                                              | No es un bloqueante (los otros juegos reales ya lo tienen); no se corrige en este spec.                                                                                                                                                               |
| `HallOfFameTable.tsx` tiene una fecha hardcodeada (`11/05/2026`) en su fila "tú"                                                                                            | Bug preexistente, no introducido por este spec; no se corrige aquí.                                                                                                                                                                                   |
| El reloj y el marcador de nenúfares dentro del canvas pueden pasar desapercibidos al estar fuera del HUD del chasis                                                         | El reloj se dibuja como barra ancha en la franja inferior con color de alerta bajo 10 s, y los nenúfares llenos quedan dibujados con una rana posada; aceptado como coste de no tocar `GamePlayer.tsx`.                                               |

## What is **not** in this spec

- Mosca bonus, cocodrilos, serpientes y rana rescatable del Frogger original.
- Controles táctiles/móviles.
- Sprites y sonidos en `public/games/ranaria/`.
- Campo de tiempo o de nenúfares en el HUD del chasis / cambios a `GamePlayer.tsx`.
- Lógica real para los 3 juegos placeholder restantes del catálogo.
- Auth real de Supabase / RLS endurecido.
- Migración de `localStorage` `av_scores` antiguo.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` más allá de lo ya existente.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

---

**Nota:** esta variante B y la variante A (`01-ranaria-trafico-minimo.md`) son **mutuamente excluyentes** — ambas ocupan el id de catálogo `ranaria`, la misma entrada de `REAL_GAMES` y la misma fila de Supabase. Implementar una deja la otra obsoleta.

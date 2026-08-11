# SPEC 10 — Controles táctiles móviles para juegos reales

> **Status:** Implemented
> **Depends on:** 05-asteroids-real, 07-tetris-real-registro, 08-arkanoid-real, 09-snake-real
> **Date:** 2026-08-11
> **Objective:** Añadir un control táctil (D-pad + hasta 2 botones de acción, ubicado debajo del canvas) a los 4 juegos reales del catálogo, visible solo en dispositivos táctiles, más el arreglo del solape de layout del HUD de `GamePlayer.tsx` en viewports angostos.

## Scope

**In:**

- Nuevo componente `app/components/TouchControls.tsx` (client component): D-pad de 4 flechas + hasta 2 botones de acción ("A"/"B"), renderizado como una franja fija **debajo** de `.crt` dentro de `GamePlayer.tsx` (D-pad a la izquierda, botones a la derecha, mismo estilo visual retro/CRT que el resto del sitio — `.btn`, `.neon-*`, paleta de la skin activa).
- Detección automática de dispositivo táctil (`matchMedia("(pointer: coarse)")` o `"ontouchstart" in window`): `TouchControls` solo se monta cuando `real === true` (juego real) **y** se detecta soporte táctil. En desktop con mouse/teclado no aparece nada nuevo.
- Mecanismo de input: `TouchControls` no se comunica con los juegos vía props nuevas — despacha `KeyboardEvent` sintéticos (`window.dispatchEvent(new KeyboardEvent("keydown"/"keyup", { code, key }))`) reusando exactamente los mismos listeners `window.addEventListener("keydown"/"keyup", ...)` que ya tiene cada uno de los 4 juegos. Cero cambios en la lógica interna de Asteroids/Tetris/Arkanoid/Snake.
- Repeat sintético para el D-pad: al mantener presionada una flecha, se despacha un `keydown` inicial y luego repeticiones a intervalo fijo (~120ms) hasta soltar (`touchend`/`touchcancel`), replicando el auto-repeat del teclado físico. Esto es lo que permite que Tetris (movimiento discreto por `keydown`) se sienta igual de fluido por touch que por teclado. En Arkanoid/Asteroids (banderas booleanas por frame) el repeat es redundante pero inofensivo.
- Mapeo explícito de botones por juego, en una nueva config `TOUCH_CONFIG` (ver Data model) — declara qué flechas del D-pad mostrar y qué `code` de teclado dispara el Botón A / Botón B (o ninguno) por juego:
  - **Asteroids**: D-pad muestra Izquierda/Derecha (rotar) y Arriba (empuje); Botón A = `Space` (disparo). Sin Botón B.
  - **Tetris**: D-pad muestra las 4 flechas (mover izq/der, soft drop abajo, rotar arriba); Botón A = `ArrowUp` (rotar, redundante con D-pad arriba pero más accesible como botón dedicado); Botón B = `Space` (hard drop).
  - **Arkanoid**: D-pad muestra solo Izquierda/Derecha (mover paddle). Sin botones de acción.
  - **Snake**: D-pad muestra las 4 flechas. Sin botones de acción.
- Fix de layout responsive en `app/components/GamePlayer.tsx` / `app/globals.css`: el HUD superior (`.player-hud`, `.hud-stat`, selector de skin, botones PAUSA/FIN/SALIR) no debe solaparse en viewports angostos (bug visible en la captura compartida: "INVITADO" y "NIVEL"/"SKIN" tapados) — se resuelve con wrap/flex-wrap y tamaños de fuente responsivos, sin rediseñar la disposición general en desktop.
- Orientación objetivo: vertical (portrait), sin forzar ni sugerir rotación a horizontal. El canvas 800×600 se escala al ancho de pantalla disponible dentro de `.crt-screen` (comportamiento responsive ya existente vía CSS), y `TouchControls` se ubica debajo en el flujo normal de la página.
- El teclado físico sigue funcionando sin cambios en todos los juegos (touch es aditivo, no reemplaza los listeners existentes).

**Out of scope (para specs futuros):**

- Gestos directos sobre el canvas (swipe/tap-to-move, tap-to-shoot). Se descarta a favor de D-pad + botones fijos, decisión explícita del usuario.
- Vibración/haptic feedback al tocar los controles.
- Reconfigurar o reposicionar los controles táctiles (D-pad izquierda-fija / botones derecha-fija no son configurables por el usuario).
- Soporte multi-touch más allá de "una flecha + un botón simultáneos" (no se testean gestos de más de 2 dedos).
- Landscape forzado o layout alternativo optimizado para horizontal.
- Cambios a `Leaderboard.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx`, o a la lógica interna de juego de Asteroids/Tetris/Arkanoid/Snake más allá de lo estrictamente necesario para el HUD.
- Tests automatizados (no hay test runner configurado).

## Data model

Reusa el contrato compartido existente sin cambios (`GameHandle`, `GameProps` en `app/components/games/types.ts`) — `TouchControls` no añade props a los juegos, solo despacha eventos de teclado sintéticos que sus listeners `window` ya consumen.

```ts
// app/data/touchControls.ts (nuevo)
export interface TouchButtonConfig {
  code: string; // KeyboardEvent.code a despachar, p. ej. "Space", "ArrowUp"
  label: string; // texto corto del botón, p. ej. "DISPARO", "ROTAR", "CAER"
}

export interface TouchConfig {
  dpad: {
    up?: boolean;
    down?: boolean;
    left?: boolean;
    right?: boolean;
  };
  buttonA?: TouchButtonConfig;
  buttonB?: TouchButtonConfig;
}

export const TOUCH_CONFIG: Record<string, TouchConfig> = {
  asteroids: {
    dpad: { up: true, left: true, right: true },
    buttonA: { code: "Space", label: "DISPARO" },
  },
  caida: {
    dpad: { up: true, down: true, left: true, right: true },
    buttonA: { code: "ArrowUp", label: "ROTAR" },
    buttonB: { code: "Space", label: "CAER" },
  },
  "bloque-buster": {
    dpad: { left: true, right: true },
  },
  serpentina: {
    dpad: { up: true, down: true, left: true, right: true },
  },
};
```

```ts
// app/components/TouchControls.tsx (nuevo)
"use client";
export default function TouchControls({ gameId }: { gameId: string }) {
  // 1. const config = TOUCH_CONFIG[gameId]; if (!config) return null;
  // 2. useEffect: detecta soporte táctil (matchMedia("(pointer: coarse)")), guarda en state `isTouch`.
  //    if (!isTouch) return null;
  // 3. Por cada flecha activa en config.dpad y cada botón definido (A/B):
  //    onTouchStart → dispatch keydown(code) inmediato + setInterval(dispatch keydown(code), 120) guardado en ref
  //    onTouchEnd/onTouchCancel → clearInterval + dispatch keyup(code)
  // 4. Render: franja fija, D-pad (grid 3x3 con flechas en cruz) a la izquierda, botones A/B a la derecha.
}
```

```tsx
// app/components/GamePlayer.tsx — cambios
import TouchControls from "./TouchControls";
// ...dentro del JSX, después de <div className="crt">...</div>:
{
  real && <TouchControls gameId={game.id} />;
}
```

No se agregan columnas ni tablas nuevas en Supabase — este spec es puramente de UI/input, sin impacto en `games`/`scores`.

## Implementation plan

1. Crear `app/data/touchControls.ts` con `TouchConfig`/`TOUCH_CONFIG` y las 4 entradas (`asteroids`, `caida`, `bloque-buster`, `serpentina`) documentadas en Data model. Prueba manual: el archivo compila (`npm run build` o el chequeo de tipos del editor), sin uso todavía.
2. Crear `app/components/TouchControls.tsx`: detección de touch, lectura de `TOUCH_CONFIG[gameId]`, render del D-pad + botones A/B con estilo retro (reusa `.btn`/paleta de skin vía `getPalette`), y el despacho de `KeyboardEvent` sintéticos con repeat de 120ms en `touchstart`/cleanup en `touchend`/`touchcancel`. Aún sin montar en ningún lado.
3. Montar `TouchControls` en `app/components/GamePlayer.tsx`, debajo de `<div className="crt">`, condicionado a `real === true` (el propio componente decide internamente si el dispositivo es táctil). Prueba manual: en Chrome DevTools con emulación de dispositivo móvil + touch, `/game/asteroids/play` muestra el D-pad y el botón DISPARO; en desktop sin emulación no aparece nada nuevo.
4. Verificar y ajustar el repeat sintético jugando Tetris por touch en emulación móvil: mantener presionada la flecha izquierda/derecha debe mover varias celdas seguidas, igual que mantener la tecla física.
5. Arreglar el solape del HUD en `app/globals.css` / `GamePlayer.tsx`: `.player-hud` y sus hijos (`hud-stat`, selector de skin, botones PAUSA/FIN/SALIR) deben usar `flex-wrap` y tamaños responsivos que eviten el solape visto en la captura, en viewports desde ~360px de ancho hacia arriba. Prueba manual: `/game/asteroids/play` en emulación de un S23/iPhone SE sin texto superpuesto.
6. Prueba manual completa por juego, en emulación táctil móvil (portrait):
   - **Asteroids**: rotar izq/der, empuje, disparo — todo por touch; jugar hasta perder una vida o game over.
   - **Tetris**: mover, soft drop, rotar (D-pad y Botón A), hard drop (Botón B) — encajar al menos una pieza y limpiar una línea si es posible.
   - **Arkanoid**: mover el paddle izq/der por touch, golpear el ladrillo.
   - **Snake**: las 4 direcciones por touch, comer al menos una fruta.
     Confirmar en los 4: PAUSA/FIN/SALIR del chasis siguen funcionando (son botones normales, no parte de `TouchControls`), y que el teclado físico sigue funcionando igual que antes (sin regresión) al probar en desktop.

## Acceptance criteria

- [ ] En un dispositivo/emulación táctil, `/game/<id>/play` de los 4 juegos reales (`asteroids`, `caida`, `bloque-buster`, `serpentina`) muestra un D-pad + botones de acción (según `TOUCH_CONFIG`) debajo del canvas.
- [ ] En desktop (sin touch), `TouchControls` no se renderiza en ningún juego real; no hay cambio visual respecto al comportamiento actual.
- [ ] Tocar cada flecha del D-pad produce el mismo efecto que la tecla de flecha correspondiente en cada uno de los 4 juegos.
- [ ] Mantener presionada una flecha del D-pad en Tetris mueve la pieza varias celdas seguidas (repeat funcional), igual que mantener la tecla física.
- [ ] En Asteroids, el Botón A dispara (`Space`); en Tetris, el Botón A rota (`ArrowUp`) y el Botón B hace hard drop (`Space`); Arkanoid y Snake no muestran botones de acción.
- [ ] Soltar una flecha o botón detiene el input (equivalente a `keyup`) sin dejar el juego "trabado" moviéndose o girando solo.
- [ ] El teclado físico sigue controlando los 4 juegos exactamente igual que antes de este spec (sin regresión), tanto en desktop como en un dispositivo táctil con teclado externo conectado.
- [ ] El HUD de `GamePlayer.tsx` (jugador, puntuación, vidas, nivel, selector de skin, PAUSA/FIN/SALIR) no muestra texto superpuesto en viewports desde ~360px de ancho.
- [ ] PAUSA/REANUDAR, FIN y el modal de fin de partida (incluido guardar puntuación) funcionan igual que antes en un dispositivo táctil.
- [ ] Los 4 juegos placeholder (`gloton`, `invasores`, `ranaria`, `duelo-pixel`) no muestran `TouchControls` (no están en `TOUCH_CONFIG` ni en `REAL_GAMES`) y no sufren regresión visual.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en los 4 `/game/<id>/play` reales, en emulación táctil y en desktop.

## Decisions

- **Sí:** control táctil = D-pad + hasta 2 botones de acción fijos debajo del canvas, no gestos sobre el canvas. Decisión explícita del usuario tras ver la captura de referencia.
- **Sí:** el D-pad y los botones se ubican en una franja separada **debajo** de `.crt-screen`, no superpuestos sobre el canvas — prioriza no tapar el juego sobre ahorrar espacio vertical.
- **Sí:** mecanismo de input = `KeyboardEvent` sintéticos despachados en `window`, reusando los listeners existentes de los 4 juegos sin modificarlos. Evita tocar `Asteroids.tsx`/`Tetris.tsx`/`Arkanoid.tsx`/`Snake.tsx`; toda la lógica nueva vive en `TouchControls.tsx` + `touchControls.ts`.
- **Sí:** mapeo de botones explícito por juego vía `TOUCH_CONFIG`, no un mapeo genérico Space/Shift para todos — evita colisiones semánticas (p. ej. Space en Asteroids también reinicia la partida en ciertas pantallas de estado) y dejar botones "fantasma" sin función en Arkanoid/Snake.
- **Sí:** Tetris resuelve sus 3 acciones (rotar, soft drop, hard drop) con el D-pad (arriba=rotar, abajo=soft drop) + 2 botones (A=rotar redundante para acceso rápido, B=hard drop), respetando el límite de "máximo 2 botones" pedido por el usuario.
- **Sí:** se simula auto-repeat (~120ms) en el D-pad mientras se mantiene presionado, necesario para que Tetris (movimiento discreto por `keydown`) se sienta jugable por touch sin tocar repetidamente.
- **Sí:** detección automática de touch vía `matchMedia("(pointer: coarse)")`/`ontouchstart`; no hay opción manual para forzar mostrar/ocultar controles táctiles en este spec.
- **Sí:** orientación objetivo es vertical (portrait) sin forzar landscape; el canvas 800×600 simplemente se escala al ancho disponible con el CSS responsive ya existente.
- **Sí:** se incluye en este spec el arreglo del solape de HUD en viewports angostos, ya que se está tocando `GamePlayer.tsx`/`globals.css` de todas formas para montar `TouchControls`.
- **No:** gestos directos (swipe/tap) sobre el canvas.
- **No:** ampliar `GameProps` con un callback de input táctil — se prefirió el mecanismo de eventos de teclado sintéticos para no tocar los 4 componentes de juego.
- **No:** vibración/haptics, reposicionamiento configurable de controles, ni soporte explícito de landscape forzado.
- **No:** tests automatizados (no hay test runner configurado).

## Risks

| Risk                                                                                                                                                             | Mitigación                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `KeyboardEvent` sintéticos (`new KeyboardEvent(...)`) no siempre reproducen fielmente `code`/`key` en todos los navegadores móviles                              | Se prueba explícitamente en emulación de Chrome DevTools (paso 3–6 del plan); si algún navegador difiere, se ajustan las propiedades del evento construido.     |
| El repeat con `setInterval` puede desincronizarse del framerate del juego (`requestAnimationFrame`) y sentirse ligeramente distinto al repeat nativo del teclado | Aceptado — el objetivo es "jugable", no "idéntico bit a bit" al repeat del SO; 120ms es un punto de partida ajustable si se siente mal en la prueba manual.     |
| Analizar `matchMedia("(pointer: coarse)")` puede dar falso negativo en laptops con pantalla táctil (mouse + touch simultáneo)                                    | Aceptado — caso raro para este catálogo; el teclado/mouse normal sigue funcionando de todas formas, `TouchControls` es aditivo, no bloquea nada si no aparece.  |
| Tocar simultáneamente D-pad + botón (multi-touch) puede no dispararse si el navegador limita a un solo `touchstart` por handler mal implementado                 | Se usan handlers independientes por elemento (`touchstart`/`touchend` por botón, no un solo listener global), que sí soportan multi-touch nativo del navegador. |
| El fix de HUD responsive puede introducir una regresión visual sutil en desktop si el `flex-wrap` cambia el orden/alineación existente                           | Prueba manual explícita en desktop (paso 6 del plan) además de móvil, comparando contra el comportamiento actual antes de mergear.                              |

## What is **not** in this spec

- Gestos directos sobre el canvas (swipe/tap-to-move/tap-to-shoot).
- Vibración/haptic feedback.
- Reposicionamiento o reconfiguración de los controles táctiles por el usuario.
- Landscape forzado o layout alternativo para horizontal.
- Cambios a la lógica interna de juego de Asteroids/Tetris/Arkanoid/Snake, o a `Leaderboard.tsx`/`HallOfFamePodium.tsx`/`HallOfFameTable.tsx`.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

## Process note

A pedido explícito del usuario, las secciones desde "Data model" en adelante se redactaron y guardaron en un solo paso, sin la confirmación sección-por-sección habitual de `/spec` (mismo patrón que en spec 09).

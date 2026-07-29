# SPEC 05 — Asteroids real en el reproductor

> **Status:** Approved
> **Depends on:** 01-mvp-visual
> **Date:** 2026-07-29
> **Objective:** Portar el juego de referencia `references/started-games/02-asteroids/game.js` a un componente React (canvas) que reemplaza la simulación visual del `GamePlayer` para Asteroids, sirviéndolo desde su propia ruta (`/game/asteroids` para el detalle, `/game/asteroids/play` para jugar) en vez de la ruta genérica dinámica, sincronizando score/vidas/nivel/game-over con el HUD real de React.

## Scope

**In:**

- Componente `app/components/games/Asteroids.tsx` (client component, ya portado en la Fase 1 de implementación): lógica completa de `game.js` sobre un `<canvas>` de 800×600. Sin cambios respecto a lo ya construido.
- Nueva ruta de detalle `app/game/asteroids/page.tsx`: mismo contenido/UI que hoy muestra la ruta genérica `/game/[id]` (portada, tags, descripción, stats, leaderboard, botón "JUGAR AHORA"), pero como página propia que busca `GAMES.find(g => g.id === "asteroids")` en vez de leer `params.id`.
- Nueva ruta de juego `app/game/asteroids/play/page.tsx`: mismo patrón que hoy usa `/game/[id]/play` (busca el registro en `GAMES` y monta `<GamePlayer game={game} />`), como página propia en vez de dinámica.
- `GamePlayer.tsx` se bifurca cuando `game.id === "asteroids"` (antes `"rocas"`): monta `<Asteroids>` dentro de `.crt-screen`, reporta score/lives/level reales vía callbacks, y conecta los botones "PAUSA"/"FIN" al `AsteroidsHandle` vía ref. Para el resto de los juegos, `GamePlayer` sigue exactamente igual que hoy (simulación visual, `.game-arena`, ticker simulado).
- `app/data/games.ts`: el registro cambia `id: "rocas"` → `id: "asteroids"`, `cover: "cover-rocas"` → `cover: "cover-asteroids"`, y se actualizan `title`/`short`/`long` para reflejar que es el juego real (mismos `cat`, `color`, `best`, `plays`).
- `app/globals.css`: se renombran las 3 reglas `.cover-rocas` / `.cover-rocas::after` / `.cover-rocas::before` a `.cover-asteroids` (mismo contenido visual, solo el nombre de clase).
- Las rutas genéricas `app/game/[id]/page.tsx` y `app/game/[id]/play/page.tsx` permanecen sin cambios de código y siguen sirviendo a los otros 7 juegos del catálogo (no reciben `id === "asteroids"` porque Next.js prioriza la ruta estática `/game/asteroids` sobre la dinámica `/game/[id]` para ese path exacto).
- Se conservan tal cual del spec original: HUD dibujado en canvas, power-up de triple disparo, wrap toroidal, captura de teclado con `preventDefault()`, guardado de puntuación en `localStorage` bajo `av_scores` (ahora con `game: "asteroids"` en las partidas nuevas).

**Out of scope (para specs futuros):**

- Controles táctiles/móviles para Asteroids.
- Lógica real para los otros 7 juegos del catálogo (siguen con la simulación visual de spec 01, sirviéndose por la ruta genérica).
- Persistencia de puntuaciones en Supabase/backend real (sigue `localStorage`).
- Arquitectura genérica/registro reutilizable para que "juegos reales" generen su propia ruta automáticamente — cada juego real nuevo seguirá agregando su propia carpeta bajo `app/game/<slug>/` de forma puntual, como se hace aquí para Asteroids. Se generalizará si hace falta cuando haya un tercer o cuarto juego real.
- Migración de entradas antiguas en `localStorage` que pudieran existir con `game: "rocas"` de pruebas previas — se acepta que queden huérfanas (no hay usuarios reales todavía, proyecto en etapa inicial).
- Eliminar o deprecar las rutas genéricas `/game/[id]` y `/game/[id]/play` — siguen vigentes para el resto del catálogo.
- Tests automatizados (no hay test runner configurado).

## Data model

No se introducen nuevas estructuras persistentes (el formato de `localStorage` `av_scores` no cambia; solo el valor de `game` pasa a ser `"asteroids"` en las partidas nuevas).

Contrato del componente de juego (ya implementado en `app/components/games/Asteroids.tsx`, pendiente de conectar `forwardRef`/callbacks en los siguientes pasos):

```ts
// app/components/games/Asteroids.tsx
export interface AsteroidsHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void; // "FIN" — sin explosión, va directo a gameover
}

export interface AsteroidsProps {
  onStateChange: (state: {
    score: number;
    lives: number;
    level: number;
  }) => void;
  onGameOver: (finalScore: number) => void;
}
// Asteroids se expone hacia GamePlayer vía forwardRef<AsteroidsHandle, AsteroidsProps>
```

`app/data/games.ts`: registro actualizado (mismo `cat`, `color`, `best`, `plays`; cambian `id`, `cover`, `title`, `short`, `long`):

```ts
{
  id: "asteroids",        // antes: "rocas"
  title: "ASTEROIDS",     // antes: "ROCAS"
  short: "...",           // texto actualizado, sin decidir aún la redacción exacta
  long: "...",            // texto actualizado, sin decidir aún la redacción exacta
  cat: "SHOOTER",
  cover: "cover-asteroids", // antes: "cover-rocas"
  color: "yellow",
  best: 41200,
  plays: "15.6K",
}
```

Rutas nuevas (sin `params` dinámicos, buscan el registro fijo por id):

```ts
// app/game/asteroids/page.tsx
export default async function AsteroidsDetailPage() {
  const game = GAMES.find((g) => g.id === "asteroids")!;
  // ... mismo JSX que hoy usa app/game/[id]/page.tsx
}

// app/game/asteroids/play/page.tsx
export default async function AsteroidsPlayPage() {
  const game = GAMES.find((g) => g.id === "asteroids")!;
  return <GamePlayer game={game} />;
}
```

`GamePlayer.tsx` guarda una `ref` a `AsteroidsHandle` para que los botones existentes "PAUSA" y "FIN" llamen `pause()/resume()` y `forceGameOver()` en vez de manipular el `setInterval` simulado (solo cuando `game.id === "asteroids"`).

## Implementation plan

1. ~~Crear `app/components/games/Asteroids.tsx`: portar `game.js` completo dentro de un `useEffect` encapsulado (sin variables de módulo globales).~~ **Ya completado.**
2. Adaptar el input: registrar los listeners dentro del mismo `useEffect` (cleanup en el `return`) y aplicar `e.preventDefault()` para `ArrowUp`, `ArrowLeft`, `ArrowRight`, `Space`.
3. Agregar el reporte de estado: tras cada `update(dt)`, si `score`/`lives`/`level` cambiaron, llamar `onStateChange({score, lives, level})`; cuando `state` pasa a `'gameover'`, llamar `onGameOver(score)` una sola vez.
4. Exponer `AsteroidsHandle` vía `forwardRef` + `useImperativeHandle` (`pause`, `resume`, `forceGameOver`).
5. Actualizar `app/data/games.ts`: `id: "rocas"` → `id: "asteroids"`, `cover: "cover-rocas"` → `cover: "cover-asteroids"`, y textos `title`/`short`/`long` describiendo el juego real.
6. Renombrar en `app/globals.css` las 3 reglas `.cover-rocas` / `::after` / `::before` a `.cover-asteroids`.
7. Modificar `app/components/GamePlayer.tsx`: rama `game.id === "asteroids"` que renderiza `<Asteroids ref={asteroidsRef} onStateChange={...} onGameOver={...} />` dentro de `.crt-screen`; sincronizar `score`/`lives`/`level` desde `onStateChange`; conectar botones "PAUSA"/"FIN" al ref; mantener sin cambios el comportamiento para el resto de juegos.
8. Crear `app/game/asteroids/page.tsx`: página de detalle propia (mismo layout/JSX que hoy usa `app/game/[id]/page.tsx`), buscando el registro fijo `GAMES.find(g => g.id === "asteroids")`.
9. Crear `app/game/asteroids/play/page.tsx`: página de juego propia (mismo patrón que `app/game/[id]/play/page.tsx`), montando `<GamePlayer game={game} />` con el registro fijo de Asteroids.
10. Prueba manual en `npm run dev`: navegar a `/game/asteroids` y `/game/asteroids/play`, jugar una partida completa (mover, disparar, power-up, perder las 3 vidas), confirmar ambos HUDs sincronizados, PAUSA/FIN funcionando, modal con score real, guardado en `localStorage`, y que `/game/rocas` ya no existe (404) mientras el resto del catálogo (`/game/[id]`) sigue funcionando igual.

## Acceptance criteria

- [ ] `/game/asteroids/play` monta el canvas real de Asteroids (800×600, escalado dentro de `.crt-screen`) en vez de la simulación CSS (`.game-arena`).
- [ ] Mover la nave (`←`/`→` rotar, `↑` propulsar), disparar (`Espacio`), wrap toroidal de bordes, y división de asteroides grandes→medianos→pequeños funcionan igual que en `references/started-games/02-asteroids`.
- [ ] El power-up de triple disparo aparece, se recoge y expira igual que en el juego de referencia.
- [ ] El HUD dibujado dentro del canvas (SCORE, NIVEL, vidas, `3x`) sigue visible y funcionando como en el original.
- [ ] El HUD real de React (`.hud-stat`: Puntuación, Vidas, Nivel) se actualiza en paralelo con los mismos valores que el HUD del canvas, en todo momento durante la partida.
- [ ] Pulsar "PAUSA" congela el juego (nave, asteroides, balas dejan de moverse); "REANUDAR" lo retoma exactamente donde quedó.
- [ ] Pulsar "FIN" fuerza game over inmediato y abre el modal existente mostrando el score real acumulado hasta ese momento.
- [ ] Perder las 3 vidas dentro del juego (sin pulsar "FIN") también abre el modal de fin de partida con el score real.
- [ ] Guardar la puntuación en el modal persiste `{game: "asteroids", score, name, at}` en `localStorage` bajo la clave `av_scores`, igual que para el resto de juegos.
- [ ] Las teclas `ArrowUp`/`ArrowLeft`/`ArrowRight`/`Space` no hacen scroll de la página mientras se juega Asteroids.
- [ ] Los otros 7 juegos del catálogo siguen mostrando la simulación visual sin cambios (sin regresión), sirviéndose por `/game/[id]` y `/game/[id]/play`.
- [ ] `/game/asteroids` (detalle) muestra el `title`/`short`/`long` actualizados reflejando que es Asteroids real, con portada usando la clase `cover-asteroids`.
- [ ] `/game/rocas` y `/game/rocas/play` ya no existen (404, al no haber ningún registro con `id: "rocas"` en `GAMES`).
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/asteroids` y `/game/asteroids/play`.

## Decisions

- **Sí:** portar la lógica de `game.js` a un componente React con `<canvas>` y `useEffect`, en vez de iframe. Decisión explícita del usuario — permite que el canvas notifique a React en cada cambio de estado para sincronizar el HUD.
- **Sí:** mantener ambos HUDs (el dibujado dentro del canvas y el HUD real de React) sincronizados al mismo estado. Decisión explícita del usuario.
- **Sí:** Asteroids tiene su propia ruta (`/game/asteroids` y `/game/asteroids/play`) en vez de servirse por la ruta genérica dinámica `/game/[id]`/`/game/[id]/play`. Decisión explícita del usuario, revirtiendo la decisión original de este spec. Los juegos aún no implementados siguen usando la ruta genérica; cada juego real nuevo agregará su propia carpeta bajo `app/game/<slug>/` de forma puntual, sin diseñar todavía una arquitectura genérica reutilizable.
- **Sí (reabierto):** cambiar el `id` de `"rocas"` a `"asteroids"` en `games.ts`, y renombrar también la clase CSS `cover-rocas` → `cover-asteroids` en `globals.css` para consistencia total. Decisión explícita del usuario — revierte la decisión original de "no cambiar el id"; ahora que la ruta es propia y se llama `asteroids`, mantener `id: "rocas"` generaría una discrepancia confusa entre id y ruta.
- **Sí:** las páginas de detalle y juego de Asteroids (`app/game/asteroids/page.tsx`, `app/game/asteroids/play/page.tsx`) siguen leyendo sus datos desde `GAMES` (`app/data/games.ts`), igual que la ruta genérica. `games.ts` sigue siendo la única fuente de verdad del catálogo.
- **Sí:** `GamePlayer.tsx` se sigue reutilizando desde la nueva ruta de Asteroids (monta `<GamePlayer game={game}/>` igual que la ruta genérica); es `GamePlayer` quien internamente bifurca por `game.id === "asteroids"` para montar `<Asteroids>` en vez de la simulación. No se duplica UI de HUD/pausa/fin/modal.
- **Sí:** implementar el juego real y su ruta propia solo para Asteroids en este spec, sin diseñar todavía una arquitectura genérica de "juegos reales". Decisión explícita del usuario — se generalizará cuando exista un segundo o tercer juego real y el patrón de "carpeta propia por juego" se repita lo suficiente para justificar abstraerlo.
- **Sí:** `preventDefault()` en las teclas de control mientras el juego está montado, para evitar el scroll de página con flechas/espacio.
- **No:** controles táctiles/móviles en este spec. El juego de referencia es solo-teclado y se replica tal cual.
- **Sí:** "PAUSA" detiene el `requestAnimationFrame` real y "FIN" fuerza `state = 'gameover'` sin explosión, en vez de remover esos botones.
- **No:** modificar el mecanismo de guardado de puntuación (`localStorage`, clave `av_scores`). Se reutiliza tal cual; solo cambia el valor de `game` (de `"rocas"` a `"asteroids"`) y el origen del `score` (real en vez de simulado).
- **No:** migrar ni limpiar entradas antiguas en `localStorage` con `game: "rocas"` de pruebas previas. Se aceptan como huérfanas — el proyecto está en etapa inicial sin usuarios reales todavía.
- **No:** eliminar o deprecar las rutas genéricas `/game/[id]` y `/game/[id]/play`. Siguen sirviendo al resto del catálogo sin cambios.

## Identified risks

- **Fugas de estado entre montajes/desmontajes:** el `game.js` original usa variables de módulo. Mitigación: todo el estado del juego vive dentro del closure del `useEffect` (ya implementado en la Fase 1).
- **Doble fuente de verdad entre HUDs:** un desfase de un frame entre el HUD del canvas y el de React es posible. Se acepta como comportamiento esperado.
- **Loop infinito en desarrollo (React Strict Mode):** Next.js en dev monta/desmonta efectos dos veces. Mitigación: cleanup explícito de `cancelAnimationFrame` y `removeEventListener`.
- **Colisión de rutas estática vs. dinámica:** al crear `app/game/asteroids/` y `app/game/asteroids/play/`, Next.js debe priorizar estas rutas estáticas sobre `app/game/[id]` y `app/game/[id]/play` para ese path exacto. Es el comportamiento estándar de App Router, pero se valida explícitamente en la prueba manual (paso 10 del plan) verificando que `/game/asteroids` no cae en la ruta dinámica ni produce conflicto de build.
- **Enlaces existentes al juego:** se verificó que ningún archivo del proyecto tiene un link hardcodeado a `/game/rocas`; todos los enlaces (`GameCard`, home, detalle) se construyen dinámicamente vía `game.id`, por lo que al renombrar el `id` a `"asteroids"` en `games.ts` esos enlaces apuntan automáticamente a las nuevas rutas sin tocarlos.
- **`localStorage` huérfano:** partidas guardadas antes de este cambio (si las hubiera) con `game: "rocas"` no se mostrarán agrupadas junto a las nuevas de `game: "asteroids"` en ningún ranking futuro que filtre por id. Aceptado (ver Decisiones) por tratarse de datos de prueba en etapa inicial.

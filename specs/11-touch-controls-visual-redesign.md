# SPEC 11 — Rediseño visual del gamepad táctil (TouchControls)

> **Status:** Implemented
> **Depends on:** 10-touch-controls-mobile (implementado)
> **Date:** 2026-08-11
> **Objective:** Rediseñar visualmente `TouchControls.tsx`/`.touch-*` en `globals.css` para que el D-pad y los botones A/B repliquen el look del gamepad de referencia (`references/gamepad-assets/gamepad.html`) — panel biselado con gema central, flechas SVG con glow, botones circulares con anillo de foco — reusando los tokens de skin ya existentes (`--cyan`/`--magenta`/`--yellow`/`--pixel`), sin tocar el mecanismo de input ni `TOUCH_CONFIG`.

## Scope

**In:**

- Rediseño visual de `.touch-controls`, `.touch-dpad`, `.touch-dbtn`, `.touch-actions`, `.touch-abtn` en `app/globals.css`: panel biselado (fondo degradado oscuro, borde sutil, sombra interior/exterior), D-pad con hub central (rombo/gema pulsante) y flechas SVG (reemplazando los glifos de texto ▲▼◀▶ actuales) con glow al presionar, botones A/B circulares con anillo de foco y letra en `var(--pixel)` con `text-shadow` de glow — todo tomado del patrón visual de `references/gamepad-assets/gamepad.html`.
- Cambios de marcado en `app/components/TouchControls.tsx` estrictamente necesarios para soportar el nuevo CSS: reemplazar los glifos `▲▼◀▶` por `<svg>` inline equivalentes a los de la referencia (mismos paths), agregar el hub central del D-pad (elemento decorativo, `aria-hidden`) y el anillo de foco (`<span>` decorativo) dentro de cada botón A/B. Los `data-key`/handlers `onTouchStart`/`onTouchEnd`/`onTouchCancel` existentes no cambian.
- Ajuste de tamaños/breakpoints (`@media (max-width: 420px)`, `@media (min-width: 901px)`) para que el nuevo diseño biselado siga siendo usable en pantallas angostas, heredando los breakpoints ya definidos por spec 10.
- Uso de los tokens de skin ya existentes (`var(--cyan)`, `var(--magenta)`, `var(--yellow)`, `var(--pixel)`, `var(--bg-2)`, `var(--line)`) para que el gamepad se vea coherente en `clasico`/`neon`/`retro` sin lógica nueva — ya varían automáticamente vía `[data-skin="neon"/"retro"]`.
- Estado `:active`/clase equivalente (el proyecto ya aplica `.touch-dbtn:active`/`.touch-abtn:active`) con el glow más intenso, replicando el feedback de "presionado" de la referencia.

**Out of scope (para specs futuros):**

- Cualquier cambio al mecanismo de input: `KeyboardEvent` sintéticos, `REPEAT_MS`, listeners `onTouchStart`/`onTouchEnd`/`onTouchCancel`, detección de touch (`useSyncExternalStore`).
- Cambios a `TOUCH_CONFIG`/`app/data/touchControls.ts` (mapeo de botones por juego).
- Reposicionamiento de la franja de controles dentro de `GamePlayer.tsx` (sigue debajo de `.crt`, ver spec 10).
- Cambios a `getPalette`/`GAME_PALETTES` (paleta de canvas por juego) — el gamepad usa los tokens site-wide de skin, no la paleta del juego.
- Vibración/haptics, gestos sobre el canvas, soporte de landscape forzado (ya descartados en spec 10).
- Nuevos assets de imagen (el PNG de referencia es solo captura, no un asset a copiar — el gamepad se construye 100% en CSS/SVG como el original).
- Tests automatizados.

## Data model

No aplica — este spec no introduce ni modifica estructuras de datos. `TOUCH_CONFIG`/`TouchConfig` (definidos en spec 10) se mantienen sin cambios; el rediseño es puramente CSS + marcado decorativo dentro de `TouchControls.tsx`.

## Implementation plan

1. Reemplazar en `app/globals.css` (bloque `/* ===== touch controls (mobile) ===== */`, líneas ~1226–1314) el CSS de `.touch-controls` por un panel biselado: fondo `linear-gradient` oscuro (usando `var(--bg-2)`/negro), borde `var(--line)`, `border-radius`, `box-shadow` con sombra exterior sutil + inset highlight/shadow, siguiendo la estructura de `.gp` en la referencia. Prueba manual: el panel se ve como una caja con relieve en vez de una franja plana (visible con DevTools sin emulación táctil, ya que el CSS no depende de JS).
2. Rediseñar `.touch-dpad`/`.touch-dbtn` con hub central: grid 3×3 (ya existe), agregar un elemento hub (rombo/gema con `clip-path: polygon(...)` y animación de pulso `@keyframes`) en el centro, y cambiar `.touch-dbtn` a fondo degradado + `box-shadow` de "botón físico" (sombra dura debajo tipo `0 4px 0 #050507`) en vez del borde plano actual.
3. En `app/components/TouchControls.tsx`, reemplazar los glifos `ARROW_GLYPH` (▲▼◀▶) por componentes SVG inline (paths equivalentes a `.dp-arrow` de la referencia) dentro de cada `<button className="touch-dbtn">`, y agregar el `<div className="touch-dpad-hub" aria-hidden>` con su gema. Prueba manual: en emulación táctil, el D-pad se ve con flechas vectoriales nítidas y el hub central animado, sin romper los `data-key`/handlers existentes.
4. Rediseñar `.touch-abtn` a círculo con `radial-gradient`, `border: 2px solid currentColor`, `box-shadow` de profundidad + glow (`var(--magenta)` para A, `var(--cyan)` para B — colores tomados de los tokens de skin activa, no fijos), letra en `var(--pixel)` con `text-shadow` de glow doble. Agregar el `<span className="touch-abtn-ring">` decorativo (anillo de foco que aparece en `:active`).
5. Ajustar `.touch-dbtn:active`/`.touch-abtn:active` (y el anillo/gema) para intensificar `box-shadow`/glow y mostrar el anillo de foco, replicando el estado "presionado" de la referencia (`.dp.on`/`.ab.on`).
6. Revisar los breakpoints `@media (max-width: 420px)` y `@media (min-width: 901px)` con los nuevos tamaños (hub, anillos, sombras) para seguir siendo legible/usable en pantallas angostas sin desbordar `.crt-screen`.
7. Prueba manual completa en emulación táctil (Chrome DevTools, portrait, ~360–420px) en los 4 juegos reales (`asteroids`, `caida`, `bloque-buster`, `serpentina`) y en las 3 skins (`clasico`/`neon`/`retro` vía el selector de `Nav.tsx`): el gamepad se ve consistente con la referencia, el color cambia por skin, y el input (probado jugando cada juego) sigue funcionando exactamente igual que antes (spec 10 no se rompe). También verificar en desktop sin emulación que `.touch-controls` sigue oculto (`@media (min-width: 901px)`).

## Acceptance criteria

- [ ] En emulación táctil, `/game/<id>/play` de los 4 juegos reales muestra el D-pad con hub central (gema) y flechas SVG en vez de los glifos de texto anteriores.
- [ ] El panel de `.touch-controls` tiene apariencia biselada (fondo degradado, borde, sombra) en vez de la franja plana anterior.
- [ ] Los botones A/B son círculos con `radial-gradient`, borde y glow de color (magenta para A, cian para B), con la letra en `var(--pixel)` y `text-shadow` de glow.
- [ ] Al presionar (`:active`/mientras se mantiene tocado) un botón del D-pad o A/B, el glow se intensifica y aparece el anillo de foco, replicando el feedback visual de la referencia.
- [ ] El gamepad cambia de color coherentemente al cambiar de skin (`clasico`/`neon`/`retro`) usando los tokens `var(--cyan)`/`var(--magenta)`/`var(--yellow)` ya existentes — sin lógica nueva de paleta.
- [ ] El input sigue funcionando exactamente igual que antes de este spec: cada flecha/botón dispara el mismo `KeyboardEvent` sintético, con el mismo repeat de 120ms, en los 4 juegos reales (sin regresión de spec 10).
- [ ] En desktop (sin touch, `min-width: 901px`), `.touch-controls` sigue oculto — sin cambio de comportamiento.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en los 4 `/game/<id>/play` reales, en emulación táctil.
- [ ] En pantallas angostas (~360px), el gamepad no desborda `.crt-screen` ni se corta visualmente.

## Decisions

- **Sí:** rediseño 100% CSS + marcado decorativo (SVG inline, `<span>`/`<div>` para hub y anillos) — sin librerías externas ni assets de imagen nuevos, igual que el `gamepad.html` de referencia (que tampoco usa imágenes, solo CSS/SVG).
- **Sí:** se reusan los tokens de skin site-wide ya existentes (`var(--cyan)`, `var(--magenta)`, `var(--yellow)`, `var(--pixel)`) en vez de introducir una paleta nueva o depender de `getPalette`/`GAME_PALETTES` (que es la paleta de _canvas_ por juego, no la de UI compartida). Mantiene el gamepad coherente con el resto del chasis (`.crt`, HUD, Nav) sin duplicar lógica de color.
- **Sí:** los glifos de texto (▲▼◀▶) del D-pad se reemplazan por SVG inline — necesario para lograr el filtro `drop-shadow` de glow que pide la referencia (no es practicable con glifos Unicode).
- **No:** cambiar el mecanismo de input, `TOUCH_CONFIG`, o el posicionamiento de la franja dentro de `GamePlayer.tsx` — fuera del alcance de este spec (puramente visual).
- **No:** copiar `gamepad-neon.png` u otro asset de imagen al proyecto — es solo material de referencia visual, no un asset a incrustar.
- **No:** tests automatizados (no hay test runner configurado).

## Risks

| Risk                                                                                                                                                                         | Mitigación                                                                                                                                                                                                                               |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Los múltiples `box-shadow`/glow/animación del hub pueden pesar en el repintado de un dispositivo móvil de gama baja durante el juego (60fps del canvas + controles animados) | El gamepad no anima nada durante el gameplay salvo el pulso del hub (CSS, no JS) y el `:active` puntual; se prueba en emulación (paso 7) que no haya jank perceptible. Si se nota, se reduce el glow/blur en vez de quitar la animación. |
| Aumentar el contraste/glow de los botones podría reducir la legibilidad de las letras A/B en la skin `retro` (colores más apagados: `#ffb000`/`#33ff66`)                     | Prueba manual explícita en las 3 skins (paso 7) verificando legibilidad, no solo en `neon`.                                                                                                                                              |

## What is **not** in this spec

- Cambios al mecanismo de input, repeat, o detección de touch.
- Cambios a `TOUCH_CONFIG`/mapeo de botones por juego.
- Reposicionamiento de la franja de controles en `GamePlayer.tsx`.
- Cambios a `getPalette`/`GAME_PALETTES` (paleta de canvas).
- Vibración/haptics, gestos sobre canvas, landscape forzado.
- Nuevos assets de imagen.
- Tests automatizados.

Cada uno de estos, si se necesita, va en su propio spec.

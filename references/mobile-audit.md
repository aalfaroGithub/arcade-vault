# Auditoría de responsive móvil

> Memoria del agente `mobile-porter` (`.claude/agents/mobile-porter.md`). No
> edites el formato a mano sin actualizar también la definición del agente.

Este archivo es **una sola tabla, una fila por ruta del sitio**.
`mobile-porter` trabaja **una ruta a la vez** (nunca en paralelo, nunca
varias rutas por corrida): antes de tocar código lee su fila aquí; al
terminar, la actualiza y solo esa.

Alcance: **navegador móvil** (Chrome Android / Safari iOS), no PWA. Anchos
de referencia: 360px, 390px, 768px, en portrait.

Valores de las columnas `360px | 390px | 768px`:

- `✅` — verificado sin defectos con Playwright.
- `—` — sin revisar todavía.
- `⚠️` — revisado, con defecto pendiente documentado en `Notas`.

`Touch targets` marca si los elementos interactivos de la ruta cumplen
≥44×44px (`sí` / `no` / `n/a` si la ruta no tiene controles propios).

## Rutas

| Ruta | Archivos | Estado | 360px | 390px | 768px | Touch targets | Defectos pendientes | Notas | Fecha |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | `app/page.tsx` | pendiente | — | — | — | no | `.home-hero` usa `100vh` en vez de `100dvh` (globals.css:1826, barra de URL móvil); `.mini-rail` se queda en 2 columnas a 320px, nunca llega a 1 (globals.css:2092); `.top-row` (`36px 1fr auto auto` + barra de progreso, globals.css:2734) sin breakpoint propio, se aprieta en móvil | Inventario inicial sembrado por exploración previa, sin verificación con Playwright todavía | 2026-08-11 |
| `/games` | `app/games/page.tsx` | pendiente | — | — | — | no | `.av-grid` usa `repeat(auto-fill, minmax(280px,1fr))` + padding lateral 16px (globals.css:642) → desborda por debajo de ~344px de viewport | Filtros (`.av-filters`/`.av-chips`) sí hacen wrap correctamente; el problema es solo el grid de cards | 2026-08-11 |
| `/hall-of-fame` | `app/hall-of-fame/page.tsx`, `HallOfFamePodium.tsx`, `HallOfFameTable.tsx` | pendiente | — | — | — | no | Tabla grid `50px 1fr 90px 90px` (globals.css:1794) ≈346px mínimos + padding/gaps → desborda en 320-360px; el podio colapsa a 1 columna a ≤720px pero pierde jerarquía visual (queda plata→oro→bronce en orden vertical, sin `order`) | La ruta más rota del catálogo según la exploración inicial — buen candidato para la primera invocación real | 2026-08-11 |
| `/game/[id]` | `app/game/[id]/page.tsx` | pendiente | — | — | — | no | `.stat-strip` sigue en `repeat(3,1fr)` sin ningún breakpoint (globals.css:975), valores pixel de 16px se cortan/desbordan; `.lb-row` `36px 1fr 110px` sin ajuste móvil | `.av-detail` ya colapsa a 1 columna a ≤900px; `.detail-tags`/`.detail-actions` ya hacen wrap | 2026-08-11 |
| `/game/[id]/play` | `app/game/[id]/play/page.tsx`, `app/components/GamePlayer.tsx` | pendiente | — | — | — | no | HUD + `.crt` (aspect-ratio 4/3) + `TouchControls` + `.crt-bottom` no caben en 360×640 sin scroll mientras se juega; canvas "next" de Tetris con posición/tamaño fijos en px se superpone al tablero en pantallas chicas (`Tetris.tsx:420-428`); `.crt-bottom` es flex `space-between` sin wrap | El solape del HUD superior y los controles táctiles ya se resolvieron en spec 10 (`specs/10-touch-controls-mobile.md`) — no repetir ese trabajo, solo lo que quedó fuera: escalado del canvas y ajuste vertical general | 2026-08-11 |
| `/about` | `app/about/page.tsx` | pendiente | — | — | — | no | Inputs de `.field input`/`textarea` sin `font-size: 16px` (globals.css:1568, :2483) → zoom automático al enfocar en iOS Safari | `.highlight-row` ya colapsa a ≤820px, `.contact-grid` ya colapsa a ≤900px | 2026-08-11 |
| `/auth` | `app/auth/page.tsx` | pendiente | — | — | — | no | `.social` es una fila de 2 botones sin wrap explícito; mismo problema de zoom de iOS en inputs que `/about` | `.auth-card` ya usa `width: min(440px, 100%)`, bien resuelto en general | 2026-08-11 |
| `/game/ranaria/play` | `app/game/[id]/play/page.tsx`, `app/components/GamePlayer.tsx`, `app/components/games/Frogger.tsx`, `app/data/touchControls.ts` | revisado | ✅ | ✅ | ✅ | sí | Overflow horizontal residual (scrollWidth 403 vs 360) causado por el nav global (`.av-mobile-panel` off-canvas + botón "Iniciar Sesión"/hamburguesa), no por la ruta: pertenece a la fila `_global_`. A 360×640 sigue haciendo falta scroll (~140px) para ver canvas + D-pad a la vez (hoy 781px de alto de documento, antes 851). Error de hidratación `data-skin` en consola (global, `SkinBootstrap`) | Frogger no estaba en `TOUCH_CONFIG` → el juego era **injugable por touch**: añadido `ranaria` con las 4 flechas y sin botones de acción (verificado: tocar ARRIBA avanza la rana, +10 pts). Nuevo bloque `@media (max-width: 480px)` en `globals.css`: `.crt` padding 24→12px (canvas 227→248px de ancho a 360), HUD compacto en una sola fila (174→110px de alto), `.crt-bottom` con wrap y centrado, modal de fin de partida apilado (el botón GUARDAR PUNTUACIÓN se salía de la tarjeta). Bloque `@media (max-width: 768px)`: input del modal a 16px (sin zoom de iOS) y botones del modal ≥44px. `.hud-actions .btn` con `min-height: 44px` en el bloque 520 ya existente. `.touch-controls:not(:has(.touch-actions))` centra el D-pad en juegos sin botones (Ranaria/Serpentina/Bloque Buster). Sin regresión a 1280px (HUD 73px, modal en fila, sin TouchControls) | 2026-08-13 |
| `_global_` (nav/layout/botones) | `app/components/Nav.tsx`, `app/layout.tsx`, `app/globals.css` | revisado | ✅ | ✅ | ✅ | sí | Ninguno pendiente de los items originales. Fricción no resuelta (fuera de alcance de esta corrida, ver Notas): mismatch de hidratación `data-skin` en consola (`SkinBootstrap`/`SkinContext.tsx`), preexistente y ya visto en la fila `ranaria` | `.btn` ahora tiene `min-height: 44px` (globals.css, regla base `.btn`) → hamburguesa y demás botones cumplen ≥44px sin cambiar look desktop. `app/layout.tsx` ya exporta `viewport` (`width: "device-width"`, `initialScale: 1`, `viewportFit: "cover"`, `themeColor: "#0a0a0f"`). Panel móvil (`Nav.tsx`) ahora bloquea scroll del body mientras está abierto (`useEffect` + `document.body.style.overflow`), cierra con `Escape`, y tiene `role="dialog"` + `aria-modal="true"` + `aria-hidden` en el `<aside>` y `aria-expanded`/`aria-controls` en el botón hamburguesa. **Causa raíz encontrada y arreglada del overflow residual reportado en la fila `ranaria`**: a ≤840px el botón "Iniciar Sesión" (`.av-nav .auth-btn`) seguía visible junto al logo y la hamburguesa en una fila `flex` sin wrap; a 360-390px ese trío no cabía y empujaba la hamburguesa fuera del viewport (right ≈402px vs 360px de ancho) — invisible/inalcanzable para un usuario real aunque Playwright podía "clickearla" (auto-scroll del locator). Arreglado ocultando `.av-nav .auth-btn` en el `@media (max-width: 840px)` ya existente (globals.css, mismo bloque que oculta `.links`/`.coin-counter`/`.av-skinner`) — es redundante ahí porque el enlace "Iniciar Sesión"/"Cuenta" ya vive dentro del panel móvil. Además, `document.documentElement` no tenía `overflow-x: hidden` (solo `body`), así que el panel off-canvas (`position: fixed`, `translateX(100%)` cuando cerrado) seguía inflando `scrollWidth` del `<html>` aunque no fuera visible — se añadió `overflow-x: hidden` también a `html`. Verificado con `document.documentElement.scrollWidth === clientWidth` en 360/390/768/1280 tanto en `/` como en `/game/ranaria/play`, y sin regresión visual a 1280px (capturas en `.playwright-screenshots/global-home-*-after.png`, `global-home-1280-final.png`, `global-nav-panel-open-360.png`) | 2026-08-13 |

## Notas de infraestructura (no tocar sin motivo)

- **Breakpoints canónicos para código nuevo**: `480px`, `768px`, `1024px`.
  No inventar anchos intermedios nuevos.
- **Breakpoints preexistentes que no se renumeran**: `840px` (nav →
  hamburguesa, `globals.css:372`) y `901px` (oculta `.touch-controls` en
  desktop, `globals.css:1310`, ver `specs/10-touch-controls-mobile.md`).
  Reutilizarlos tal cual si un fix cae naturalmente ahí; nunca cambiarles el
  valor.
- Breakpoints existentes ya usados en el resto del sitio, incoherentes entre
  sí: 420, 520, 600, 720, 820, 840, 900, 901, 980, 1100 — no es necesario
  unificarlos todos de una vez, cada invocación de `mobile-porter` solo
  ajusta lo que toca su ruta.
- Sitio sin modo claro (único tema oscuro) y sin PWA (sin `manifest.ts`,
  sin service worker) — fuera de alcance de este agente por decisión
  explícita del usuario.
- Capturas de verificación siempre en `.playwright-screenshots/`, nunca en
  la raíz del repo (convención del proyecto, ver `CLAUDE.md`).

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
| `_global_` (nav/layout/botones) | `app/components/Nav.tsx`, `app/layout.tsx`, `app/globals.css` | pendiente | — | — | — | no | `.btn` mide ~36-38px de alto efectivo, por debajo del mínimo táctil de 44px (globals.css:437); falta `export const viewport` en `app/layout.tsx` (sin `viewportFit`/`themeColor`); el panel móvil del nav (`Nav.tsx:159-225`) no bloquea el scroll del body, no cierra con `Escape`, no tiene `aria-expanded`/`role="dialog"` | Afecta a todas las rutas — conviene revisarlo junto con la primera ruta que se trabaje, no de forma aislada | 2026-08-11 |

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

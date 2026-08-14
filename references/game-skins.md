# Skins por juego

> Memoria del agente `skin-designer` (`.claude/agents/skin-designer.md`). No
> edites el formato a mano sin actualizar también la definición del agente.

Este archivo es **una sola tabla, una fila por juego del catálogo**
(`app/data/games.ts`). `skin-designer` trabaja **un juego a la vez** (nunca en
paralelo, nunca varios juegos por corrida): antes de tocar código lee su fila
aquí; al terminar, la actualiza y solo esa.

Valores de las columnas `clasico | neon | retro`:

- `✅` — implementada y verificada con Playwright en `/game/<id>/play`.
- `—` — falta.
- `⚠️` — existe con una fricción documentada en `Notas`.

`paletteRef` es `✅` cuando el `draw()` del juego lee la paleta desde un ref
sincronizado en cada render (nunca la prop directamente — ver
`app/components/games/types.ts`). `Sprites` marca si el juego pinta desde un
PNG (Arkanoid, Snake-frutas) en vez de formas vectoriales.

## Juegos

| ID | Juego | Real | clasico | neon | retro | paletteRef | Sprites | Notas | Fecha |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `asteroids` | Asteroids | sí | ✅ | ⚠️ | ✅ | ✅ | no | HUD dentro del canvas (`Asteroids.tsx` `drawHUD`/`drawOverlay`); usa `ink`, `inkDim`, `accent`, `entities[0]` (llama de propulsión). Glow soportado vía helper `applyGlow()` (`ctx.shadowBlur`/`shadowColor`, no-op con `glow: 0`, así que `clasico`/`retro` quedan idénticos). `neon`: cyan `#00f5ff` + acento magenta + llama amarilla, `glow: 12`. `retro`: fósforo ámbar `#ffb000` + único acento verde `#33ff66`, `glow: 0`. ⚠️ `neon`/`retro` sin verificar con Playwright (sesión sin navegador) | 2026-08-11 |
| `caida` | Caída (Tetris) | sí | ✅ | — | — | ✅ | no | `entities[]` indexado igual que `PIECES` (índice 0 sin usar); `ink` = highlight superior del bloque | 2026-08-09 |
| `bloque-buster` | Bloque Buster (Arkanoid) | sí | ✅ | ⚠️ | ⚠️ | ✅ | sí | Todo el spritesheet se tiñe vía offscreen cacheado por `palette.tint` (`getSpriteSheet()`); `clasico` usa `tint: null` = sprite original sin teñir. `tint` **semitransparente** a propósito para conservar sombreado y variedad de ladrillos (opaco los aplanaría a una silueta). Glow soportado vía helper `withGlow()` (`ctx.shadowBlur`/`shadowColor`, no-op exacto con `glow: 0`, así que `clasico`/`retro` no cambian) y aplicado **solo** a pala, bola, explosiones y el texto "CARGANDO..." — los ~60 ladrillos no llevan sombra por coste de render. `neon`: `tint rgba(0,245,255,0.6)`, `ink #00f5ff`, acento `#ff006e`, `glow: 12`. `retro`: `tint rgba(255,176,0,0.72)` (fósforo ámbar), acento `#33ff66`, `glow: 0`. ⚠️ `neon`/`retro` sin verificar con Playwright (sesión sin navegador) | 2026-08-11 |
| `serpentina` | Serpentina (Snake) | sí | ✅ | ⚠️ | ⚠️ | ✅ | sí | `entities[0]`=cabeza, `entities[1]`=cuerpo, `ink`=franja de brillo de la cabeza, `grid`=líneas de la grilla; las 22 frutas de `fruits.png` **nunca se tiñen** en ninguna skin — decisión explícita, son el elemento identificable del juego. Glow soportado vía helper `applyGlow()` en `Snake.tsx` (solo sobre los segmentos de la serpiente, nunca sobre la fruta ni la grilla; no-op con `glow: 0`, así que `clasico` queda idéntico). `neon`: cabeza cyan `#00f5ff` + cuerpo magenta `#ff006e` + brillo amarillo, `glow: 10`. `retro`: cabeza ámbar `#ffb000` + cuerpo fósforo `#33ff66`, `glow: 0`. ⚠️ `neon`/`retro` sin verificar con Playwright (sesión sin navegador) | 2026-08-11 |
| `gloton` | Glotón | no | — | — | — | — | — | Placeholder: sin componente en `REAL_GAMES`, solo `.cover-glot` y demo animada | – |
| `invasores` | Invasores | no | — | — | — | — | — | Placeholder: sin componente en `REAL_GAMES`, solo `.cover-invaders` y demo animada | – |
| `ranaria` | Ranaria (Frogger) | sí | ✅ | ⚠️ | ⚠️ | ✅ | no | Ya es real (`Frogger.tsx` en `REAL_GAMES`), la fila anterior decía "placeholder" — corregido contra el código. `entities[0..4]` = coche, camión, tronco, tortuga, rana; `entities[5..8]` = fondos de zona (carretera, río, franja segura, fila de bocas) migrados desde las constantes `ZONE_COLOR` de `Frogger.tsx` sin cambiar valores en `clasico` (`ZONE_COLOR` queda solo como fallback). `accent` = marco de las bocas (`clasico` pasa de `#8bc34a` no usado a `#d4af37`, el dorado que ya se dibujaba: sin cambio visual). `ink` = HUD interno. Glow vía helper `applyGlow()`/`clearGlow()` (no-op con `glow: 0`) sobre cuerpo de vehículos/troncos/tortugas, rana y marco de bocas; ruedas, cabina, vetas, ojos y barra de tiempo del HUD siguen con colores neutros fijos a propósito. `neon`: zonas casi negras tintadas, coche/tronco `#ff006e`, camión `#f5ff00`, tortuga `#00f5ff`, rana `#00ff88`, marco `#f5ff00`, `glow: 10`. `retro`: fósforo ámbar (`#ffb000`/`#ffd166`/`#a86a12`/`#ffe9b0`) + único acento verde `#33ff66` para rana y marco, `glow: 0`. ⚠️ `neon`/`retro` sin verificar con Playwright (sesión sin navegador) | 2026-08-13 |
| `duelo-pixel` | Duelo Pixel | no | — | — | — | — | — | Placeholder: sin componente en `REAL_GAMES`, solo `.cover-duelo` y demo animada | – |

## Notas de infraestructura (no tocar sin motivo)

- Fuente de verdad de las paletas: `app/data/skins.ts` (`GAME_PALETTES`,
  `getPalette`). `getPalette` cae a `clasico` si falta la skin o el juego.
- Selector global de sitio en `app/components/Nav.tsx` (`.av-skinner`),
  estado en `app/components/SkinContext.tsx` (`av_skin` en `localStorage`,
  patrón idéntico a `av_user`).
- Tokens compartidos por skin (Nav, HUD, `.crt`, `.neon-*`) en
  `app/globals.css`, bloques `[data-skin="neon"]` / `[data-skin="retro"]`
  bajo el comentario `===== skins: ... =====`. `clasico` es el `:root`, sin
  bloque propio.
- El cambio de skin es **en caliente**: no reinicia la partida (`skin` no
  forma parte de `key={resetKey}` en `GamePlayer.tsx`).

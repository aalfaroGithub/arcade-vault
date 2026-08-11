# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar arcades online y competir por puntuación. Catálogo de 8 juegos: 4 son **reales y jugables** (Asteroids, Tetris, Arkanoid, Snake) con leaderboard persistido en Supabase; los otros 4 siguen siendo placeholders con una demo animada y puntuaciones simuladas.

## ⚠️ Next.js version warning

This repo pins `next@16.2.10`, `react@19.2.4`. Next.js 16 has breaking changes vs. earlier versions you may know from training data (Turbopack is now the default bundler for `dev`/`build`, `middleware` renamed to `proxy`, Cache Components, etc.). **Before writing code that touches routing, config, caching, middleware, or build behavior, read the relevant doc under `node_modules/next/dist/docs/`** (organized as `01-app/01-getting-started`, `02-guides`, `03-api-reference`, etc.) rather than relying on prior knowledge. `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` covers the 15→16 breaking changes specifically.

Nota: las páginas tipadas usan el helper generado `PageProps<"/game/[id]">` de Next 16 (ver `app/game/[id]/page.tsx`), no una interfaz `params` escrita a mano.

No test runner is configured yet.

## Commands

```bash
npm run dev            # Next dev server (Turbopack)
npm run build          # Build de producción
npm run lint           # ESLint
npm run format         # Prettier --write .
npm run format:check   # Prettier --check .
```

## Architecture

- **App Router** bajo `app/`. Rutas actuales:
  - `/` home, `/about`, `/games` (catálogo con búsqueda + filtro por categoría), `/hall-of-fame`, `/auth`
  - `/game/[id]` ficha del juego (Server Component; lee leaderboard y stats reales de Supabase si el juego es real)
  - `/game/[id]/play` chasis de juego
  - `/api/contact` (Resend), `/api/health/supabase` (health check)
- **Styling**: Tailwind CSS v4 vía `@tailwindcss/postcss` (sin `tailwind.config.*`; v4 es CSS-first). En la práctica casi todo el estilo retro/CRT vive como CSS plano en `app/globals.css` — clases como `.av-player`, `.crt`, `.btn`, `.neon-cyan`, `.cover-*`. **Sigue ese patrón** en vez de introducir utilidades Tailwind sueltas en componentes nuevos.
- Path alias `@/*` → raíz del proyecto (`tsconfig.json`). TypeScript strict mode on.
- **Prettier + ESLint** configurados (`.prettierrc.json`, `eslint.config.mjs` con `eslint-config-prettier`). Un hook `PostToolUse` (`.claude/hooks/format-and-lint.mjs`) formatea y linta automáticamente cada archivo que se escribe o edita — no hace falta correr Prettier a mano tras un Edit/Write.

### Datos y catálogo

- `app/data/games.ts` — catálogo estático (`GAMES`), fuente de verdad de la UI: `id`, `title`, `cat`, `cover`, `color`, `best`/`plays` de respaldo. Ids: `bloque-buster`, `caida`, `serpentina`, `gloton`, `invasores`, `asteroids`, `ranaria`, `duelo-pixel`.
- `app/data/realGames.ts` — **registro `REAL_GAMES`**: mapea un `id` del catálogo a su componente React real. Es el único punto de bifurcación real/placeholder; `GamePlayer`, `/game/[id]` y `/hall-of-fame` consultan `id in REAL_GAMES` en lugar de comparar ids a mano. Mapeo actual: `asteroids`→Asteroids, `caida`→Tetris, `bloque-buster`→Arkanoid, `serpentina`→Snake y más (ver `references/implemented-games.md` cuando necesites revisar cuales juegos estan implementados y como implementar nuevos).
- `app/data/scores.ts` (`seededScores`) y `app/data/players.ts` — datos simulados, solo para los juegos que aún son placeholder.

### Contrato de juego real

Todo juego real es un componente cliente en `app/components/games/` que renderiza su propio `<canvas>` y cumple `app/components/games/types.ts`:

- **Props**: `onStateChange({ score, lives, level })` y `onGameOver(finalScore)`.
- **Ref imperativa (`GameHandle`)**: `pause()`, `resume()`, `forceGameOver()` — las usa la botonera del chasis.
- El chasis (`app/components/GamePlayer.tsx`) posee el HUD, la pausa, el modal de fin de partida y el guardado de puntuación. El juego portado **no** debe dibujar su propio HUD, overlay de game over ni menú de pausa; debe redirigir ese estado a `onStateChange`/`onGameOver`.
- Reinicio: `GamePlayer` remonta el componente cambiando `key={resetKey}`; el juego no necesita un método `restart`.
- Juegos sin vidas o sin niveles mapean su métrica propia sobre `lives`/`level` para el HUD (decisión que se toma en el spec, no en el código).
- Assets del juego van a `public/games/<slug>/` (ver `public/games/arkanoid/`, `public/games/serpentina/`).

### Supabase

- Clientes en `lib/supabase/`: `client.ts` (browser, `createBrowserClient`), `server.ts` (`createServerClient` con cookies), `queries.ts`, `types.ts`.
- Consultas disponibles: `insertScore`, `getTopScores`, `getPlayerBest`, `getGameStats`.
- Esquema (schema `public`, RLS habilitado en ambas tablas):
  - `games(id text PK, title, short, long, cat, cover, color, best int, plays text)`
  - `scores(id uuid PK, game_id text → games.id, user_id uuid → auth.users.id nullable, name text, score int, created_at timestamptz)`
- ⚠️ **`scores.game_id` tiene FK a `games.id`**: la fila del juego debe existir en `games` antes de insertar cualquier puntuación. Al añadir un juego real, la migración que inserta su fila en `games` va primero.
- MCP de Supabase configurado en `.mcp.json` (proyecto `mjkmixmvleqfjjcdwqjr`). Úsalo para inspeccionar el esquema (`list_tables`) y aplicar migraciones.
- Variables de entorno: ver `.env.template` (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_DB_PASSWORD`, `RESEND_API_KEY`).

### Auth (simulada)

No hay auth real todavía. `/auth` guarda un `{ name }` en `localStorage` bajo la clave `av_user`; `app/components/Nav.tsx` exporta `readAvUser`/`writeAvUser`/`useAvUser` (con `useSyncExternalStore` + evento `av-user-change`). El nombre solo se usa para prellenar el campo de iniciales al guardar puntuación y para resaltar "tu mejor marca" en el Hall of Fame. `scores.user_id` existe en el esquema pero siempre va `null`.

### Skins

Cada juego real ofrece al menos 3 skins — `clasico` (default), `neon` y `retro` —, todas legibles sobre el fondo oscuro del sitio (único modo, no hay tema claro).

- `app/data/skins.ts` — fuente de verdad: `GamePalette`, `GAME_PALETTES` (id de juego → skin → paleta) y `getPalette(gameId, skin)` (cae a `clasico` si falta la skin o el juego).
- Selector global de sitio en `app/components/Nav.tsx` (`.av-skinner`); estado en `app/components/SkinContext.tsx` (`av_skin` en `localStorage`, mismo patrón `useSyncExternalStore` que `av_user`). El cambio de skin es **en caliente**: `skin` no forma parte de `key={resetKey}` en `GamePlayer.tsx`, así que no reinicia la partida.
- Tokens compartidos por skin (Nav, HUD, `.crt`, `.neon-*`) en `app/globals.css`, bloques `[data-skin="neon"]`/`[data-skin="retro"]`; `clasico` es el `:root`, sin bloque propio.
- Cada juego lee su paleta vía un `paletteRef` sincronizado en cada render (nunca la prop `palette` directo dentro del loop, que vive en un `useEffect(..., [])`) — ver `app/components/games/types.ts` para el contrato exacto y cualquiera de los 4 juegos reales para el patrón.
- Memoria de qué juego tiene qué skin: `references/game-skins.md`.

## Skills

- **`/frontend-design`** — úsala siempre para diseñar interfaces de usuario.
- **Agente `game-planner`** — úsalo primero para decidir **qué** juego añadir al catálogo. Evalúa candidatos (diversidad de categoría, viabilidad en canvas, encaje con el leaderboard, estética retro) y mantiene memoria en `references/game-suggestions-todo.md` como una **tabla** (una fila por candidato/estado). Es seguro lanzarlo en **varias instancias en paralelo**: cada una reclama y escribe solo sus propias filas. Ver `.claude/agents/game-planner.md`.
- **Agente `skin-designer`** — úsalo para auditar/implementar las skins (`clasico`/`neon`/`retro`) de **un** juego real, pasándole su `id` (p. ej. `@skin-designer caida`). Trabaja un solo juego por invocación — no lo lances en paralelo ni le pases varios ids. Mantiene memoria en `references/game-skins.md` (una fila por juego). Ver `.claude/agents/skin-designer.md` y la sección Skins más arriba.
- **`/spec-game`** (en vez de `/spec`) cuando el requerimiento sea añadir un juego real jugable con leaderboard al catálogo — úsalo después de `game-planner` para especificar **cómo** portarlo. Genera un spec en `specs/` con las preguntas y el contrato de integración específicos: origen del juego, mapeo al catálogo, contrato de HUD, fricciones de portado y orden de la migración de Supabase. Ver `.claude/skills/spec-game/` (incluye `references/integration-contract.md`, el checklist completo de integración).

## Spec Driven Design

This project follows spec-driven development using `/spec` and `/spec-impl`, based on practices from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

Use `/spec` before implementing new features, then `/spec-impl` to implement against the spec. Para el caso concreto de añadir un juego real jugable con leaderboard, usa `/spec-game` en su lugar — mismo flujo aguas abajo (`Draft` → aprobar → `/spec-impl`).

Los specs viven en `specs/NN-slug.md` y se numeran secuencialmente. Estado actual (`01`–`09`): MVP visual, home/about, formulario de contacto con Resend, integración de Supabase, Asteroids real, leaderboard en Supabase, Tetris, Arkanoid y Snake — todos implementados. Lee los dos specs más recientes antes de escribir uno nuevo para heredar convenciones.

## References

`references/` guarda material fuente, **no** código de la app:

- `references/started-games/` — los juegos originales en JS vanilla (`02-asteroids`, `03-tetris`, `04-arkanoid`) que se portan a React.
- `references/source-assets/` — sprites y assets sueltos antes de moverse a `public/games/`.
- `references/templates/` — maquetas JSX/HTML del diseño original de cada pantalla.

## Conventions

- Toda la UI está en español (textos, labels, fechas con `toLocaleDateString("es-ES")`, números con `toLocaleString("es-ES")`).
- Las capturas de Playwright van a `.playwright-screenshots/`, nunca a la raíz del repo.
- El trabajo se hace en ramas por spec (`spec-NN-slug`) y entra a `main` vía pull request.

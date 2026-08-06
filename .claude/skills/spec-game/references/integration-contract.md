# Integration contract for real, playable games

This file is the reference `/spec-game` consults when drafting the Data model, Implementation plan, and Risks sections. **It is not text to copy verbatim into a spec** — it's the shape and the known traps to draw from, adapted to the specific game being spec'd. Only include the parts that actually apply.

The single source of truth for all of this is `app/components/games/Asteroids.tsx` — it's the only real port done so far. When in doubt, read it rather than trust a paraphrase here.

---

## Component contract

Generalized from `AsteroidsHandle`/`AsteroidsProps` in `app/components/games/Asteroids.tsx`:

```ts
export interface GameHandle {
  pause(): void;
  resume(): void;
  forceGameOver(): void; // no death animation, jumps straight to game over
}

export interface GameProps {
  onStateChange: (state: {
    score: number;
    lives: number; // games without lives: decide and record how this is represented (e.g. always 0, or repurposed)
    level: number; // games without levels: repurpose (e.g. lines cleared) — record the mapping explicitly
  }) => void;
  onGameOver: (finalScore: number) => void;
}
// Component exposed via forwardRef<GameHandle, GameProps>
```

`GamePlayer.tsx`'s HUD (`.hud-stat`) renders exactly these three fields (Puntuación, Vidas, Nivel) — a new spec must say explicitly what a lives-less or level-less game does with the fields it doesn't have, not leave it to be improvised during implementation.

## Mandatory porting pattern

The reference games under `references/started-games/` are vanilla JS with **module-level mutable state** (`let ship, bullets, ...` at file scope) and a raw `requestAnimationFrame` loop reading/writing globals directly. None of that can survive as-is in a React component that may mount/unmount (React Strict Mode mounts effects twice in dev). The Asteroids port established the pattern to convert it:

1. **All mutable game state lives inside a single `useEffect(..., [])`.** Not module variables, not `useState`, not multiple effects — one effect, `let` bindings in its closure. `useState`/`useRef` are reserved for the React-facing boundary only.
2. **`reportState()` diffs manually** against `lastReportedScore`/`lastReportedLives`/`lastReportedLevel` before calling `onStateChange`, so it doesn't trigger a React re-render every frame — only when a HUD-visible value actually changed.
3. **`onGameOver` fires exactly once**, guarded by a `gameOverReported` flag set the first time the game's internal state transitions to its terminal state.
4. **Two refs bridge control into the effect:** an internal `controlsRef` (a plain ref, filled in by the effect once it runs, since the effect runs *after* the initial render) holding closures over `paused`/`rafId`/`lastTime`, and the `forwardRef`-exposed `useImperativeHandle` that only ever delegates to `controlsRef.current?.*`. Don't try to call `useImperativeHandle` directly from inside the effect — it can't see the effect's closure until this indirection.
5. **The loop**: `requestAnimationFrame`, with `dt` capped (Asteroids caps at `0.05`s) to avoid physics blowing up after a tab was backgrounded. `pause()` calls `cancelAnimationFrame`; `resume()` resets `lastTime = null` so the next frame doesn't compute a huge `dt` from the paused interval.
6. **Restart happens from outside**, by remounting the component with a changing `key={resetKey}` prop from `GamePlayer`. The component itself does not expose a `reset()` method — don't add one unless the spec has a concrete reason `key` remounting won't work for this game.
7. **Input listeners attach to `window`** with `preventDefault()` on the codes that would scroll the page, and are cleaned up in the effect's `return`.

## Generic registry (`app/data/realGames.ts`)

If this file doesn't exist yet, its introduction is a prerequisite spec, not part of any one game's spec (see `SKILL.md` Phase 1 step 5). When it exists, the shape is roughly:

```ts
// app/data/realGames.ts
import { ComponentType, RefAttributes } from "react";
import type { GameHandle, GameProps } from "../components/games/shared-types"; // or wherever the shared contract lives

export interface RealGameEntry {
  component: ComponentType<GameProps & RefAttributes<GameHandle>>;
  hasLives: boolean; // drives whether GamePlayer's Vidas stat renders
}

export const REAL_GAMES: Record<string, RealGameEntry> = {
  asteroids: { component: Asteroids, hasLives: true },
  // new entries go here
};
```

`GamePlayer.tsx` replaces its 7 `isAsteroids`-branched blocks (HUD derivation, the simulated ticker, `togglePause`, `endGame`, `restart`, `saveScore`, and the render) with a single `const real = REAL_GAMES[game.id]` lookup, rendering `<real.component>` when present and falling back to the placeholder `.game-arena` simulation otherwise. `app/hall-of-fame/page.tsx` does the analogous thing: `tab in REAL_GAMES` instead of `tab === "asteroids"`. The redundant static routes `app/game/asteroids/page.tsx` / `app/game/asteroids/play/page.tsx` collapse back into the generic `app/game/[id]/*` routes once the branching moves into the registry — a game's spec should say explicitly whether it deletes those two files as part of the registry prerequisite spec.

## Integration checklist

Every point a new real game must touch, once the registry exists:

| Point                        | File                                                          |
| ----------------------------- | --------------------------------------------------------------- |
| Game component                | `app/components/games/<Game>.tsx`                              |
| Registry entry                | `app/data/realGames.ts`                                        |
| Catalog entry                 | `app/data/games.ts` (`GAMES` array — reuse or add an `id`)     |
| Cover art CSS                 | `app/globals.css` (`.cover-<id>` + `::before`/`::after`)       |
| `games` row (Supabase)        | migration, applied before any `insertScore` for this id         |
| Detail page + leaderboard     | generic `app/game/[id]/page.tsx`, no per-game route needed      |
| Hall of fame                  | `app/hall-of-fame/page.tsx` — registry lookup, not a new branch |

## Reusable data layer — nothing new needed here

`lib/supabase/queries.ts` is already parameterized by `gameId: string` for all four functions — a new game needs **zero** new query code:

- `insertScore(gameId, name, score): Promise<void>`
- `getTopScores(gameId, limit): Promise<ScoreRow[]>`
- `getPlayerBest(gameId, name): Promise<ScoreRow | null>`
- `getGameStats(gameId): Promise<{ plays: number; best: number }>`

Types: `GameRow`, `ScoreRow` in `lib/supabase/types.ts`. UI-facing row type: `ScoreEntry` in `app/data/scores.ts` (`{ rank, name, score, date }`), which `Leaderboard.tsx`, `HallOfFamePodium.tsx`, and `HallOfFameTable.tsx` all consume.

## Known traps to carry into Risks (only the ones that apply)

- **FK ordering:** `scores.game_id` references `games.id`. Without a `games` row for the new id, `insertScore` throws — and `GamePlayer.tsx`'s `saveScore()` swallows that error silently (`.catch(() => {})`), so the failure is invisible unless explicitly tested. The plan must insert the `games` row before any playtest that saves a score.
- **`Leaderboard.tsx` uses `key={r.name}`** in its row list — two real players sharing a name collides. Not a blocker (Asteroids shipped with it), but worth a line in Risks if a new game's expected playerbase makes name collisions more likely.
- **`HallOfFamePodium.tsx`** already handles `rows.length < 3` with an "AÚN NO HAY PUNTUACIONES" message — reuse it, don't reimplement the guard.
- **`HallOfFameTable.tsx`** has a hardcoded date `11/05/2026` in its "you" row — pre-existing bug, not introduced by a new game, but don't copy the pattern.
- **No `supabase/migrations/` directory exists in this repo.** The schema lives only as a SQL block inside `specs/06-leaderboard-supabase.md`. A new game's migration should be written the same way (SQL block in the spec, applied by hand or via MCP during `/spec-impl`) unless the user wants to introduce versioned migrations — that would itself be a separate, out-of-scope decision to flag rather than assume.

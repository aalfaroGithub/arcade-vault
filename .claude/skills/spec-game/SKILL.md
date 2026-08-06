---
name: spec-game
description: Designs a spec for adding a real, playable game with a Supabase leaderboard to Arcade Vault. Asks about the game's origin, state contract and porting frictions, then writes specs/NN-slug.md. Use it before implementing any new game.
disable-model-invocation: true
argument-hint: "game name, or a folder under references/started-games/"
---

# /spec-game — Guided spec designer for real, playable games

This skill helps you produce a spec for turning one entry in the game catalog into a real, playable game with a Supabase leaderboard. **You don't write code here.** Your job is to gather the integration decisions this project has already had to make twice (Asteroids' port, then its leaderboard), turn them into questions, and write a spec that `/spec-impl` can execute without surprises.

This skill is a specialization of `/spec` for one recurring shape of feature. It follows the same four-phase discipline and the same `specs/` template. **Before writing any spec file, read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in full** — don't paraphrase them from memory or from this document. `/spec-game` borrows its phase structure, tone, and section-by-section confirmation discipline directly from `/spec`; treat those two files as the authority on _how_ to write and save a spec, and treat this file as the authority on _what to ask_ for this specific kind of feature. The difference is Phase 1 (domain-specific context gathering) and Phase 2 (domain-specific questions); Phases 3 and 4 follow `/spec`'s own instructions, not a paraphrase of them.

## Philosophy

Arcade Vault only has one real game today (Asteroids) and seven placeholders. Getting Asteroids working took two specs and left several non-obvious decisions buried in code: the `games` row must exist before any `scores` insert (foreign key), the HUD assumes `{score, lives, level}` which not every game has, and `GamePlayer.tsx` currently bifurcates on `game.id === "asteroids"` in seven separate places. A new game's spec must decide, on paper, how it plugs into all of that — before anyone starts porting `game.js`.

## Command flow

- Follow the four phases in order. **Do not skip phases.**
- Your replies must be in the same language as the initial prompt (this repo's specs are written in Spanish with English section labels — match that convention when the prompt is in Spanish).

### Phase 1 — Understand the context

Before asking questions about the game, gather, **in this order**:

1. **Read `.claude/skills/spec/SKILL.md` and `.claude/skills/spec/template.md` in full.** This is the authoritative definition of how a spec in this repo is structured, questioned, drafted, and saved — every later phase of `/spec-game` defers to what these two files say. Do this even if you believe you already know their contents; they may have changed since this skill was written.
2. Read `CLAUDE.md` (it imports `AGENTS.md`) for project conventions.
3. List `specs/` to determine the next sequential number, and read the two most recent specs to pick up current conventions — `specs/05-asteroids-real.md` and `specs/06-leaderboard-supabase.md` are required reading regardless of recency: they are the only precedent for this exact kind of spec.
4. List `references/started-games/`. If `$ARGUMENTS` names or resembles one of those folders, read its `game.js`, `index.html`, `CLAUDE.md`, and note any assets (images, sounds) under it.
5. Read `app/components/games/Asteroids.tsx` — it is the only real port done so far and the canonical pattern for the next one. Read `app/data/games.ts` to see which catalog `id`s are still placeholders (no matching real game yet).
6. Check whether `app/data/realGames.ts` exists.
   - **It does not exist yet:** the codebase still hardcodes `game.id === "asteroids"` across `GamePlayer.tsx` and `app/hall-of-fame/page.tsx`, and has a redundant static route pair (`app/game/asteroids/page.tsx`, `app/game/asteroids/play/page.tsx`) duplicating the generic `app/game/[id]/*` routes. Tell the user this refactor (a generic `REAL_GAMES` registry that `GamePlayer` and the hall of fame look up instead of branching by id) doesn't exist yet, and ask whether to produce a **separate prerequisite spec** for it first (e.g. `NN-real-games-registry.md`), with this game's spec depending on it (`Depends on:`). Do not fold the registry refactor into the game's own spec — it is a distinct, independently commitable change per the template's rule that each implementation step ships something functional.
   - **It exists:** the game's spec can stay small — component + one entry in the registry + one catalog entry + one CSS cover class + one Supabase row.
7. Read `references/integration-contract.md` (in this skill's directory) — it has the component contract, the mandatory porting pattern, the full integration checklist, and known traps. Use it as your source of truth for Phase 2 and for drafting the Data model section; don't re-derive it from scratch.
8. Query Supabase read-only: `mcp__supabase__list_tables` to see the current rows/shape of `games` and `scores`. This tells you whether the target catalog `id` already has a row (it shouldn't) and confirms the schema hasn't drifted from what `specs/06-leaderboard-supabase.md` describes.

If `$ARGUMENTS` is empty, ask which game (by catalog id, or "new") this spec is for before continuing.

### Phase 2 — Clarify through questions

Ask in blocks of 3–5, same rhythm as `/spec`. These are the categories specific to this domain — don't skip any that apply:

**Origin (always ask first, it gates the rest):**

- Port from `references/started-games/<X>`, or design a new game from scratch? Only these two origins are in scope for this skill — an external path or repo is out of scope, note it and stop that thread if raised.

**Catalog mapping:**

- Does this reuse an existing placeholder `id` from `app/data/games.ts` (e.g. `caida` for a Tetris-shaped game, `bloque-buster` for an Arkanoid-shaped one), or does it need a brand-new entry? A new entry needs a new `.cover-<id>` CSS rule in `app/globals.css` (all covers are pure CSS gradients, no images — point to an existing `.cover-*` rule as the pattern to follow).

**State contract:**

- `GamePlayer`'s HUD assumes `{score, lives, level}`. Does this game have lives? (Tetris-shaped games typically don't — they have `lines` instead.) Decide explicitly: does the HUD generalize to an optional-lives shape, or does the game map its own metric onto `level`/`lives` for display purposes? Record the decision, don't leave it implicit.

**Porting frictions** — only ask the ones that apply to the detected origin, based on what you read in Phase 1 step 4 and `references/integration-contract.md`:

- Does the original have its own HUD in DOM elements outside the canvas? → needs redirecting to `onStateChange`.
- Does it have its own pause key or in-canvas pause menu? → duplicates the chassis's PAUSA button; decide which wins or how they're unified.
- Does it draw its own game-over overlay/modal? → duplicates `GamePlayer`'s modal.
- Does it use a second canvas (e.g. a "next piece" preview)? → doesn't fit inside the single `.crt-screen` container as-is; decide how it's handled.
- What's its native aspect ratio? `.crt-screen` is fixed `4/3`; anything else needs an explicit decision (letterbox, stretch, or resize the canvas).
- Does it load external assets (images, audio)? → they go under `public/`, and the game loop can't start until they've loaded; decide the loading state.
- Does it have terminal states beyond `playing | dead | gameover` (e.g. a `win` state)? → the current `AsteroidsHandle`/`onGameOver` contract doesn't have one; decide whether to extend it.

**Controls:**

- Which keys does the game use, and which of them need `e.preventDefault()` to stop page scroll?

**Supabase:**

- Confirm explicitly, as a plan step, that the `games` row insert happens _before_ any `insertScore` call reaches production — `scores.game_id` is a foreign key, and today's `insertScore` swallows the resulting error silently.

**When to stop asking:** same three questions as `/spec` — which files change, what's the first and last executable step, how is "done" verified — plus a fourth specific to this domain: does the plan insert the `games` row before anything can call `insertScore` for this id?

### Phase 3 — Develop the spec section by section

Identical discipline to `/spec`: one section at a time, shown in markdown, confirmed before moving on, following exactly what `.claude/skills/spec/SKILL.md` Phase 3 and `.claude/skills/spec/template.md` say — you already read both in Phase 1 step 1; don't redefine the structure here.

Section-specific guidance for this domain:

- **Data model:** draw the `GameHandle`/`GameProps` contract and the registry entry shape from `references/integration-contract.md`, adapted to this game's specifics (e.g. if it has no lives, show how that's represented).
- **Implementation plan:** must include, in order, whenever they apply — (a) the prerequisite registry spec if Phase 1 step 6 flagged it's missing, (b) the component port following the mandatory pattern (single `useEffect`, `reportState` diffing, `controlsRef` + `useImperativeHandle`), (c) the catalog/registry/CSS entries, (d) the Supabase `games` row insert, (e) wiring into `GamePlayer`/hall of fame, (f) manual test playing a full game. Each step must leave the app running per the template's rule.
- **Decisions:** always include the state-contract decision (lives vs. no lives) and the aspect-ratio decision explicitly — these are exactly the kind of thing that gets improvised mid-implementation if not pinned down here.
- **Risks:** carry over the known traps from `references/integration-contract.md` that apply (FK ordering, `Leaderboard.tsx`'s `key={r.name}` collision risk, the hardcoded date in `HallOfFameTable`) — only the ones relevant to this game, don't paste the whole list.

### Phase 4 — Save the spec

Follow `.claude/skills/spec/SKILL.md` Phase 4 exactly: determine the next number from `specs/`, confirm the filename with the user, write `specs/NN-slug.md` with `Status: Draft`, seed `specs/.spec-config.yml` if missing. Set `Depends on:` to include `06-leaderboard-supabase` and, if Phase 1 step 6 applies, the prerequisite registry spec (by name if already written, or noted as "pending" if the user chose to fold it in — though that's discouraged).

Confirm to the user:

- Path of the created file.
- Reminder: state is `Draft`.
- If a prerequisite registry spec was also identified but not yet written, remind the user it needs its own `/spec-game`-adjacent pass (or a plain `/spec`) before this one can be implemented, since `/spec-impl` will otherwise hit a missing `app/data/realGames.ts`.
- Next step: once reviewed and approved, run `/spec-impl NN-slug`.
- **Stop here.**

## Hard rules

- **Never write game code, component code, or SQL during this command.** Only the spec's `.md` file (and, if the user agrees, a second prerequisite spec `.md` file).
- **Never write to Supabase.** Only read via `mcp__supabase__list_tables` (or other read-only MCP tools) to inform questions. Any migration is a _step in the plan_, executed later by `/spec-impl` with confirmation — not by this skill.
- **Never mark a spec `Approved`.** That's a human action.
- **Never propose implementing after saving.** Your job ends at the confirmation message.
- **Never assume the registry refactor is out of scope just because it's inconvenient.** If `app/data/realGames.ts` doesn't exist, say so and offer the prerequisite spec — don't quietly write a one-off `game.id === "..."` branch into this spec's plan, that's exactly the pattern this skill exists to stop repeating.
- **Never invent porting frictions that don't apply.** Only ask about the ones you actually found by reading the referenced game's source in Phase 1 — don't ask about a "next piece" canvas for a game that doesn't have one.

## Arguments

If invoked as `/spec-game tetris` (or similarly naming a `references/started-games/` folder or its theme), use that as the origin signal for Phase 1 step 3 — but confirm with the user rather than assuming a match. If invoked without arguments, ask which game this is for before continuing.

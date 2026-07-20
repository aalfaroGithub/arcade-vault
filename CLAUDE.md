# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

Arcade Vault — plataforma para jugar online y competir por puntuación. Está en etapa inicial (scaffold de `create-next-app`, sin funcionalidad propia implementada todavía).

## ⚠️ Next.js version warning

This repo pins `next@16.2.10`, `react@19.2.4`. Next.js 16 has breaking changes vs. earlier versions you may know from training data (Turbopack is now the default bundler for `dev`/`build`, `middleware` renamed to `proxy`, Cache Components, etc.). **Before writing code that touches routing, config, caching, middleware, or build behavior, read the relevant doc under `node_modules/next/dist/docs/`** (organized as `01-app/01-getting-started`, `02-guides`, `03-api-reference`, etc.) rather than relying on prior knowledge. `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` covers the 15→16 breaking changes specifically.

## Commands

```bash
npm run dev      # start dev server (Turbopack, default in Next 16)
npm run build    # production build (Turbopack by default)
npm run start    # run production build
npm run lint      # ESLint via eslint-config-next (flat config)
```

No test runner is configured yet.

## Architecture

- App Router under `app/` (`app/layout.tsx` root layout, `app/page.tsx` home page) — no other routes/components exist yet.
- Styling: Tailwind CSS v4 via `@tailwindcss/postcss` (no `tailwind.config.*`; v4 is CSS-first — configuration lives in `app/globals.css`).
- Path alias `@/*` maps to the project root (see `tsconfig.json`).
- TypeScript strict mode is on.

## Spec Driven Design

This project follows spec-driven development using `/spec` and `/spec-impl`, based on practices from https://github.com/Klerith/fernando-skills, installed via:

```bash
npx skills@latest add Klerith/fernando-skills
```

Use `/spec` before implementing new features, then `/spec-impl` to implement against the spec.

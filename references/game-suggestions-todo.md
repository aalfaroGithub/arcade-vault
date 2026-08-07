# TODO — Sugerencias de juegos

> Memoria del agente `game-planner` (`.claude/agents/game-planner.md`). No
> edites el formato a mano sin actualizar también la definición del agente.
> Última revisión: 2026-08-07

## 🎯 Recomendado ahora

_(vacío — aún no ha corrido `game-planner`)_

## 📋 Pendientes / backlog

- [ ] **GLOTÓN** — `gloton` · ARCADE · sugerido 2026-08-07
  - **Por qué encaja:** placeholder ya en `GAMES` (cover, color amarillo, best/plays simulados). Tipo Pac-Man: laberinto + comida + fantasmas.
  - **Score model:** puntos por pastilla/fruta + bonus por fantasma, acumulativo y monótono — encaja bien con leaderboard.
  - **Riesgo de portado:** requiere IA de persecución para fantasmas (4 entidades con pathfinding simple) y un mapa de laberinto — más trabajo de diseño que los juegos ya portados (Asteroids/Tetris/Arkanoid/Snake son más lineales).

- [ ] **INVASORES** — `invasores` · SHOOTER · sugerido 2026-08-07
  - **Por qué encaja:** placeholder existente, misma categoría que Asteroids (ya real) — refuerza SHOOTER en vez de diversificar.
  - **Score model:** puntos por oleada/enemigo, muy natural para leaderboard.
  - **Riesgo de portado:** bajo — grid de enemigos + disparo, similar en complejidad a Arkanoid. Buen candidato técnico pero SHOOTER ya tiene representante real (`asteroids`), así que pesa menos en diversidad de categoría.

- [ ] **RANARIA** — `ranaria` · ARCADE · sugerido 2026-08-07
  - **Por qué encaja:** placeholder existente. Tipo Frogger: cruzar carriles de tráfico/río.
  - **Score model:** puntos por avance de fila + bonus por tiempo — acumulativo, funciona con leaderboard.
  - **Riesgo de portado:** carriles con velocidades/objetos distintos requieren más tuning que un solo sistema de físicas; medio-bajo.

- [ ] **DUELO PIXEL** — `duelo-pixel` · VERSUS · sugerido 2026-08-07
  - **Por qué encaja:** único placeholder en categoría VERSUS — hoy VERSUS no tiene ningún juego real, mayor diversidad de categoría que los otros tres candidatos.
  - **Score model:** ⚠️ riesgo — un versus 1v1 (tipo Pong) no tiene un "score de leaderboard" tan natural como los demás; habría que definir una métrica solitaria (contra IA, puntos antes de perder) para que tenga sentido con `insertScore`/`getTopScores`.
  - **Riesgo de portado:** requiere decidir modo single-player vs IA (el leaderboard actual es de un solo jugador por partida) — friction de diseño a resolver en el spec antes de portar.

## ❌ Descartados

_(ninguno todavía)_

## ✅ Implementados

- **ASTEROIDS** — `asteroids` · SHOOTER · real desde spec 05
- **CAÍDA** (Tetris) — `caida` · PUZZLE · real desde spec 07
- **BLOQUE BUSTER** (Arkanoid) — `bloque-buster` · ARCADE · real desde spec 08
- **SERPENTINA** (Snake) — `serpentina` · ARCADE · real desde spec 09

---
name: spec-impl-game
description: Implements an approved spec for a real, playable game (from /spec-game or the game-jam agent), then chains skin-designer and mobile-porter — in that order, never in parallel — so "implemented" means skins + mobile responsive are done too. Use it instead of /spec-impl when the spec adds a new real game to the catalog.
disable-model-invocation: true
argument-hint: <NN-spec-name> (puede ser game-jam/<game-id>/NN-slug)
---

# /spec-impl-game — Implementer of approved game specs

Esta skill es una **especialización de `/spec-impl`** para el caso concreto de
un spec que añade un juego real jugable al catálogo (los que produce
`/spec-game` o el agente `game-jam`). No redefine ni parafrasea cómo se
identifica un spec, se valida su estado o se crea la rama — eso ya lo resuelve
`/spec-impl` y aquí solo se delega. Lo que esta skill añade son dos fases
nuevas al final: encadenar `skin-designer` y luego `mobile-porter`, en ese
orden, nunca en paralelo, antes de cerrar el spec.

**Antes de hacer nada, lee `.claude/skills/spec-impl/SKILL.md` completo.** No
lo resumas de memoria — puede haber cambiado desde que se escribió este
archivo. Esa skill es la autoridad sobre _cómo_ identificar el spec, validar
su estado y crear la rama; este archivo es la autoridad sobre _qué pasa
después de implementar_.

## Argumento

`$ARGUMENTS` se resuelve exactamente como en `/spec-impl` Fase 1, con una
salvedad: los specs de `game-jam` viven en subcarpetas
(`specs/game-jam/<game-id>/NN-slug.md`), así que si el usuario pasa algo como
`game-jam/frogger/01-...` o solo el nombre del juego, búscalo también bajo
`specs/game-jam/`, no únicamente en `specs/` de forma plana.

## Fases 1–4 — Delegadas íntegramente a `/spec-impl`

Ejecuta, sin modificarlas, las cuatro fases de
`.claude/skills/spec-impl/SKILL.md`:

1. Identificar el spec.
2. Validar que su estado significa "Aprobado" (en cualquier idioma) — si no,
   detente con el mismo mensaje de error estándar, sin crear rama ni tocar
   código.
3. Crear/cambiar a la rama `spec-NN-slug` según `AutoCreateBranch`.
4. Implementar el plan paso a paso, con pausa y confirmación explícita tras
   cada paso, exactamente con el mismo ritmo y las mismas reglas (ambigüedad →
   detente y presenta opciones; fuera de alcance → no lo implementes).

No avances a la Fase 4.5 si la Fase 4 de `/spec-impl` no terminó todos los
pasos del plan.

## Fase 4.5 — Verificar criterios de aceptación

Al terminar el último paso del plan, recorre uno por uno los criterios de
aceptación del spec (la sección `## Acceptance criteria` / `## Criterios de
aceptación`). Repórtalos como una lista con su resultado (cumplido / no
cumplido). **Todavía no** marques el spec como `Implementado` ni hagas el
commit final — eso ocurre recién en la Fase 7, después de los dos agentes.

Si algún criterio no se cumple, detente aquí: corrígelo (siguiendo la misma
disciplina de la Fase 4) antes de continuar a la Fase 5.

## Fase 5 — `skin-designer`

1. Determina el **id de catálogo** del juego a partir del spec: su sección de
   mapeo al catálogo (`app/data/games.ts`) y/o la entrada nueva en
   `app/data/realGames.ts` (`REAL_GAMES`). Si el spec no fija el id de forma
   inequívoca, **pregunta al usuario y detente** — nunca lo adivines.
2. Anuncia la invocación (`Voy a lanzar @skin-designer <id> para las 3 skins
del juego. ¿Continúo?`) y **espera confirmación explícita** antes de
   lanzarlo — mismo ritmo de pausas que la Fase 4.
3. Lanza el agente `skin-designer` con el id como único argumento.
4. Espera su reporte completo y relayalo al usuario en español — el reporte
   de un subagente no llega solo, hay que reenviarlo.
5. Nota de fricción esperable: `skin-designer` mantiene
   `references/game-skins.md` con una fila por juego del catálogo. Los 8 ids
   actuales ya tienen fila; si el spec introdujo un id de catálogo nuevo, el
   agente puede reportar que falta su fila — no es un fallo de esta skill,
   solo repórtalo tal cual.

No avances a la Fase 6 hasta tener el reporte completo de `skin-designer`.

## Fase 6 — `mobile-porter`

1. Ruta fija: **`/game/[id]/play`** (la pantalla de juego: HUD, canvas 4/3 y
   `TouchControls` del juego nuevo). No uses ninguna otra ruta ni se la
   dejes elegir al agente — pasar exactamente una ruta por invocación es
   regla dura del agente.
2. Anuncia la invocación (`Voy a lanzar @mobile-porter /game/[id]/play. ¿Continúo?`)
   y espera confirmación explícita, igual que en la Fase 5.
3. Lanza el agente `mobile-porter` con `/game/[id]/play` como única ruta.
4. Espera su reporte completo y relayalo al usuario en español.
5. La ficha del juego (`/game/[id]`) queda **fuera de esta skill** — al
   reportar, sugiere `@mobile-porter /game/[id]` como una invocación manual
   posterior, sin ejecutarla.

## Fase 7 — Cierre

Solo después de que la Fase 6 haya terminado:

1. Marca el spec como `Implementado` (o el equivalente que ya use el
   repositorio) actualizando su línea de estado.
2. Recuerda al usuario el commit final y el flujo de PR hacia `main` (rama por
   spec, según `CLAUDE.md`) — no lo ejecutes sin que te lo pidan.
3. Da un reporte final en español que consolide:
   - Pasos del plan implementados.
   - Resultado de cada criterio de aceptación (Fase 4.5).
   - Resumen de lo que hizo `skin-designer` y de lo que hizo `mobile-porter`.
   - Fricciones que ningún agente pudo resolver — decláralas explícitamente,
     no las des por arregladas ni las simules.

## Reglas duras

1. **Nunca lances `skin-designer` y `mobile-porter` en paralelo, ni en el
   mismo mensaje.** El primero escribe `app/data/skins.ts` (y el `draw()` del
   juego); el segundo escribe `app/globals.css`. Ambos se declaran
   serializados y correrlos a la vez puede pisarse el uno al otro. Espera el
   reporte completo de `skin-designer` antes de invocar `mobile-porter`.
2. Nunca te saltes la Fase 4.5 (verificación de criterios) para llegar antes a
   los agentes.
3. Nunca marques el spec como `Implementado` antes de terminar la Fase 6.
4. Nunca marques un spec como `Aprobado` — sigue siendo una acción humana,
   heredado de `/spec-impl`.
5. Si el spec identificado **no** es de un juego real (no tiene un componente
   nuevo bajo `app/components/games/` ni una entrada nueva en `REAL_GAMES` en
   su plan), dilo y redirige al usuario a `/spec-impl` en su lugar — no
   ejecutes las Fases 5–6 contra un spec al que no le aplican.
6. Nunca invoques `game-planner` ni el agente `game-jam` desde esta skill —
   deciden _qué_ juego añadir, no son parte de implementar uno ya spec'd.
7. Nunca lances más de una invocación de `skin-designer` o de `mobile-porter`
   por corrida de esta skill — cada uno trabaja un solo juego/ruta a la vez.

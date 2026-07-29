# SPEC 02 — Home (landing) y Acerca de

> **Status:** Implemented
> **Depends on:** 01-mvp-visual
> **Date:** 2026-07-28
> **Objective:** Introducir una landing page real en `/` (hero, features, preview de juegos, stats, actividad en vivo, pricing, CTA final) y una página `/about` con contacto simulado, moviendo la Biblioteca actual de `/` a `/games` y actualizando la navegación, reproduciendo `references/templates/home-about/`.

## Scope

**In:**

- Nueva página en `app/page.tsx` (Home/landing): hero con silhouettes flotantes, sección "¿Por qué Arcade Vault?" (features), preview de juegos, stats, "Actividad en vivo" + "Top jugadores hoy", pricing/FAQ, CTA final — según `references/templates/home-about/home.jsx`.
- Nueva página `app/about/page.tsx`: hero/misión, highlights, divisor decorativo y formulario de contacto — según `references/templates/home-about/about.jsx`.
- Mover la Biblioteca actual (`app/page.tsx` existente, filtros + grid de juegos) de `/` a `/games` (`app/games/page.tsx`).
- Actualizar `app/components/Nav.tsx`: 4 links — Inicio (`/`), Biblioteca (`/games`), Salón de la Fama, Acerca de (`/about`); logo apunta a `/`.
- Actualizar todos los links internos que hoy asumen que `/` es la Biblioteca (p. ej. "Volver a la Biblioteca" en `/hall-of-fame`, cualquier `router.push("/")`/`<Link href="/">` con esa semántica) para que apunten a `/games`.
- Migrar a `app/globals.css` los bloques CSS del Home/About aún no presentes (`home-*`, `about-*`, `feature-*`, `mini-*`, `activity-*`, `tick-*`, `top-*`, `pricing-*`, `price-*`, `contact-*`, `faq-*`, `highlight*`, `div-*`), tomados de `references/templates/home-about/styles.css`.
- Sección "Juegos disponibles ahora" del Home reutiliza `GAMES.slice(0, 6)` de `app/data/games.ts` (mismo dato que Biblioteca).
- "Actividad en vivo" y "Top jugadores hoy" del Home se generan con la lógica ya existente (`seededScores`, `PLAYERS`) en vez de migrar los arrays hardcodeados del prototipo, para mantener consistencia con Salón de la Fama.
- Formulario de contacto de `/about`: simulación visual igual al prototipo (validación de campos vacíos con "shake", estado "enviado" con terminal de éxito simulada), sin backend ni persistencia.

**Out of scope (para specs futuros):**

- Cualquier lógica de juego real, backend, base de datos o autenticación real (igual que 01-mvp-visual).
- Envío real del formulario de contacto (email, API, persistencia en `localStorage` o backend).
- Cambios funcionales a `/game/[id]`, `/game/[id]/play`, `/auth` o `/hall-of-fame` más allá de corregir los links que apuntaban a `/` como Biblioteca.
- SEO, metadata u Open Graph.
- Tests automatizados (no hay test runner configurado).

## Data model

No se introducen tipos nuevos de dominio; se reutiliza `Game`, `ScoreEntry`, `PLAYERS` y `seededScores` ya existentes. Se agrega un único helper nuevo para el ticker de actividad, porque `seededScores` no asocia un juego a cada fila:

```ts
// app/data/scores.ts (adición)
export interface ActivityEntry {
  player: string;
  gameTitle: string;
  score: number;
  timeAgo: string; // "hace 2 min"
  color: "cyan" | "magenta" | "yellow" | "green";
}

// Recorre GAMES cíclicamente, usa el mismo generador pseudoaleatorio
// determinista que seededScores, y compone timeAgo como `hace ${(i+1)*3} min`.
export function seededActivity(
  seed: number,
  games: Game[],
  count?: number,
): ActivityEntry[];
```

Uso en el Home:

- **"Juegos disponibles ahora"**: `GAMES.slice(0, 6)`.
- **"Top jugadores hoy"**: `seededScores(SEED_FIJO, 5)` — reutiliza `rank`/`name`/`score` tal cual, sin tipo nuevo.
- **"Actividad en vivo"**: `seededActivity(SEED_FIJO, GAMES, 7)`.

`SEED_FIJO` es una constante local en `app/page.tsx` (el Home no depende de estado del usuario, a diferencia de Salón de la Fama que usa el tab activo como seed).

## Implementation plan

1. Migrar a `app/globals.css` los bloques CSS del Home/About que faltan (`home-*`, `about-*`, `feature-*`, `mini-*`, `activity-*`, `tick-*`, `top-*`, `pricing-*`, `price-*`, `contact-*`, `faq-*`, `highlight*`, `div-*`) desde `references/templates/home-about/styles.css`. El proyecto sigue compilando sin cambios visuales todavía.
2. Mover la Biblioteca: crear `app/games/page.tsx` con el contenido actual de `app/page.tsx` (hero, buscador, chips, grid). `app/page.tsx` queda temporalmente vacío/placeholder en este paso.
3. Agregar `seededActivity` a `app/data/scores.ts`.
4. Implementar el nuevo Home en `app/page.tsx`: hero con silhouettes flotantes, sección de features, preview de juegos (`GAMES.slice(0, 6)` enlazando a `/game/[id]`), sección de stats, "Actividad en vivo" + "Top jugadores hoy" (usando `seededActivity`/`seededScores`), pricing/FAQ y CTA final. Todos los CTAs que en el prototipo navegan a "biblioteca" apuntan a `/games`; los que navegan a "auth" apuntan a `/auth`.
5. Implementar `app/about/page.tsx`: hero/misión, highlights, divisor decorativo y formulario de contacto controlado (estado `sent`/`shake`, validación de campos vacíos, terminal de éxito simulada al enviar).
6. Actualizar `app/components/Nav.tsx`: agregar links "Inicio" (`/`) y "Acerca de" (`/about`) en desktop y menú móvil; "Biblioteca" pasa a apuntar a `/games`; `isActive` distingue `home` de `biblioteca`.
7. Revisar y corregir referencias internas que asumían `/` como Biblioteca: link "Volver a la Biblioteca" en `/hall-of-fame`, y cualquier otro `Link`/`router.push` equivalente en `/game/[id]`, `/game/[id]/play`, `/auth`.
8. Pasada final de pulido: recorrer `/`, `/games`, `/about` y el resto de rutas en el navegador, comparar visualmente contra `references/templates/home-about/`, verificar responsive (incluyendo `feature-grid`, `mini-rail`, `activity-grid`, `pricing-grid`, `contact-grid`) y que no queden enlaces rotos a la vieja semántica de `/`.

## Acceptance criteria

- [x] `/` muestra el nuevo Home: hero con silhouettes flotantes y CTAs, sección "¿Por qué Arcade Vault?", preview de juegos, stats, "Actividad en vivo", "Top jugadores hoy", pricing/FAQ y CTA final.
- [x] Los CTAs del Home que en el prototipo navegaban a "biblioteca" (hero, preview de juegos, CTA final) enlazan a `/games`; los que navegaban a "auth" (hero, pricing) enlazan a `/auth`.
- [x] La sección "Juegos disponibles ahora" muestra los primeros 6 juegos de `GAMES` y cada tarjeta enlaza a `/game/[id]` con el `id` correcto.
- [x] "Top jugadores hoy" y "Actividad en vivo" muestran datos generados a partir de `PLAYERS`/`seededScores`/`seededActivity`, no arrays hardcodeados.
- [x] `/games` reproduce exactamente la funcionalidad que hoy tiene `/` (hero, buscador funcional, chips de categoría funcionales, grid de tarjetas enlazando a `/game/[id]`).
- [x] `/about` muestra hero/misión, highlights y formulario de contacto.
- [x] En `/about`, enviar el formulario con algún campo vacío dispara la animación "shake" y no avanza al estado "enviado".
- [x] En `/about`, enviar el formulario con todos los campos completos muestra la terminal de éxito simulada con el nombre ingresado, y "Enviar otro mensaje" reinicia el formulario.
- [x] El Nav (desktop y menú móvil) muestra 4 links — Inicio, Biblioteca, Salón de la Fama, Acerca de — y cada uno resalta como activo en su ruta correspondiente (`/`, `/games` y `/game/*`, `/hall-of-fame`, `/about`).
- [x] El logo del Nav navega a `/`.
- [x] El link "Volver a la Biblioteca" en `/hall-of-fame` (y cualquier otro equivalente encontrado en el paso 7 del plan) apunta a `/games`, no a `/`.
- [x] No quedan enlaces internos que dependan de la semántica anterior de `/` como Biblioteca.
- [x] El proyecto compila y corre sin errores de consola en `/`, `/games`, `/about` y el resto de rutas existentes (`npm run dev`).

## Decisions

- **Sí:** `/` pasa a ser el nuevo Home (landing) y la Biblioteca se mueve a `/games`. Decisión explícita del usuario, alineada con `nav.jsx` del prototipo (que ya trata "Inicio" y "Biblioteca" como ítems separados).
- **No:** mantener `/` como Biblioteca y meter el Home nuevo en otra ruta (p. ej. `/home`). Descartado por el usuario a favor de la opción anterior.
- **Sí:** formulario de contacto de `/about` es una simulación puramente visual (sin backend, sin persistencia en `localStorage`). Decisión explícita del usuario; no hay ningún panel/admin que consuma esos mensajes, así que persistirlos no aporta valor funcional.
- **Sí:** "Juegos disponibles ahora" reutiliza `GAMES.slice(0, 6)` de `app/data/games.ts` en vez de duplicar datos. Mantiene una única fuente de verdad para el catálogo, ya establecida en 01-mvp-visual.
- **Sí:** "Actividad en vivo" y "Top jugadores hoy" se generan con la lógica seedeada ya existente (`seededScores`, `PLAYERS`) más un helper nuevo (`seededActivity`), en vez de migrar los arrays hardcodeados del prototipo. Decisión explícita del usuario; evita nombres/puntajes inconsistentes entre el Home y Salón de la Fama.
- **Sí:** se migran a `app/globals.css` únicamente los bloques CSS del Home/About que faltan, reutilizando el resto del sistema visual ya portado en 01-mvp-visual (mismas variables `--cyan`, `--magenta`, clases `.btn`, `.pixel`, `.chip`, etc.).
- **No:** introducir Tailwind o un sistema de diseño nuevo para estas páginas. Mismo criterio que 01-mvp-visual: fidelidad visual al prototipo por sobre reescritura con utilidades.

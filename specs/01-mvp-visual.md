# SPEC 01 — MVP visual de Arcade Vault

> **Status:** Approved
> **Depends on:** —
> **Date:** 2026-07-20
> **Objective:** Implementar, solo a nivel visual y con rutas reales de Next.js App Router, las 5 pantallas del prototipo (biblioteca, detalle, reproductor, auth, salón de la fama) reproduciendo el diseño de `references/templates/`.

## Scope

**In:**

- 5 rutas reales bajo `app/` con App Router: `/` (biblioteca), `/game/[id]` (detalle), `/game/[id]/play` (reproductor), `/auth` (login/registro/invitado), `/hall-of-fame` (salón de la fama).
- Componente `Nav` (barra superior + menú hamburguesa móvil) con estado de sesión simulado.
- Datos ficticios tipados en TypeScript bajo `app/data/`, separados en varios archivos (p. ej. `games.ts`, `players.ts`, `scores.ts`), migrados desde `references/templates/data.jsx`.
- Componentes de UI en `app/components/`: `GameCard`, `Leaderboard`/`LeaderboardRow`, `HallOfFamePodium`, `HallOfFameTable`, formularios de `Auth`, HUD y CRT del `GamePlayer`, etc.
- Simulación visual del reproductor: ticker de puntuación falso, "enemigos" animados por CSS, pausa/fin, modal de fin de partida — sin lógica de juego real.
- Mock de sesión y puntuaciones vía `localStorage` (login/registro/invitado actualiza el nav; "guardar puntuación" persiste en `localStorage`), igual que el template.
- Comportamiento responsive (grid, tablas, menú móvil) reproduciendo los breakpoints del CSS ya migrado en `app/globals.css`.
- Reutilización total de las clases/estilos ya presentes en `app/globals.css` (no se introduce un sistema de diseño nuevo).

**Out of scope (para specs futuros):**

- Cualquier lógica de juego real (los 8 juegos del catálogo siguen sin implementarse).
- Backend, base de datos o API real — los datos en `app/data/` son el reemplazo temporal explícito.
- Autenticación real (OAuth de Google/GitHub son botones visuales sin función).
- Persistencia real de puntuaciones más allá del mock de `localStorage`.
- Tests automatizados (no hay test runner configurado en el proyecto).
- Multijugador o partidas en tiempo real.

## Data model

Todos los datos ficticios viven en `app/data/`, tipados en TypeScript, como reemplazo temporal de una futura base de datos.

```ts
// app/data/games.ts
export type GameCategory = "ARCADE" | "PUZZLE" | "SHOOTER" | "VERSUS";

export interface Game {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: GameCategory;
  cover: string;   // clase CSS de portada, p. ej. "cover-bricks"
  color: "cyan" | "magenta" | "yellow" | "green";
  best: number;
  plays: string;
}

export const GAMES: Game[] = [ /* 8 juegos, migrados de data.jsx */ ];
export const CATEGORIES: Array<"TODOS" | GameCategory> = ["TODOS", "ARCADE", "PUZZLE", "SHOOTER", "VERSUS"];
```

```ts
// app/data/players.ts
export const PLAYERS: string[] = [ /* 18 nombres, migrados de data.jsx */ ];
```

```ts
// app/data/scores.ts
import { PLAYERS } from "./players";

export interface ScoreEntry {
  rank: number;
  name: string;
  score: number;
  date: string; // DD/MM/YYYY
}

export function seededScores(seed: number, count?: number): ScoreEntry[];
// generador pseudoaleatorio determinista, igual al de data.jsx
```

Convenciones:

- Los IDs de juego (`bloque-buster`, `caida`, etc.) son los mismos slugs usados en `references/templates/data.jsx` y se reutilizan como `[id]` de ruta.
- Los textos de UI (títulos, categorías, etiquetas) se mantienen en español; solo los segmentos de URL (`/game`, `/play`, `/auth`, `/hall-of-fame`) van en inglés.

## Implementation plan

1. Crear los archivos de datos ficticios en `app/data/` (`games.ts`, `players.ts`, `scores.ts`), migrados y tipados desde `references/templates/data.jsx`. El proyecto sigue compilando; la home sigue siendo el boilerplate de `create-next-app`.
2. Crear `app/components/Nav.tsx` (client component): logo, links "Biblioteca"/"Salón de la Fama", contador de créditos, botón de sesión (invitado/usuario), menú hamburguesa móvil. Lee/escribe la sesión mock en `localStorage`. Integrarlo en `app/layout.tsx` reemplazando el `<div id="root">` actual por el `Nav` + `children` + footer.
3. Implementar la pantalla Biblioteca en `app/page.tsx` (reemplaza el boilerplate): hero, buscador, chips de categoría y grid de tarjetas, usando `app/components/GameCard.tsx` y los datos de `app/data/games.ts`.
4. Implementar la pantalla Detalle en `app/game/[id]/page.tsx`: portada, info del juego, tags, stats y tabla de mejores puntuaciones vía `app/components/Leaderboard.tsx` (usa `seededScores`).
5. Implementar la pantalla Reproductor en `app/game/[id]/play/page.tsx` (client component): HUD (jugador/puntuación/vidas/nivel), pantalla CRT con la simulación visual (ticker de puntuación, "enemigos" animados por CSS), pausa/fin y modal de fin de partida que guarda la puntuación mock en `localStorage`.
6. Implementar la pantalla Auth en `app/auth/page.tsx` (client component): tabs "Iniciar sesión"/"Crear cuenta", acceso como invitado, botones sociales visuales (sin función), que al enviar el formulario guardan el usuario mock en `localStorage` y redirigen a `/`.
7. Implementar la pantalla Salón de la Fama en `app/hall-of-fame/page.tsx`: tabs por juego, podio (oro/plata/bronce), tabla completa y fila "tu mejor marca" cuando hay sesión activa.
8. Pasada final de pulido: recorrer las 5 rutas en el navegador, comparar visualmente contra `references/templates/`, ajustar detalles responsive y eliminar cualquier resto del boilerplate de `create-next-app` (`/next.svg`, `/vercel.svg`, textos por defecto).

## Acceptance criteria

- [ ] `/` muestra la Biblioteca: hero, buscador funcional (filtra por título), chips de categoría funcionales (filtran por `cat`) y grid de tarjetas de juego.
- [ ] Cada tarjeta de juego enlaza a `/game/[id]` con el `id` correcto.
- [ ] `/game/[id]` muestra portada, descripción, tags, estadísticas y la tabla de mejores puntuaciones para ese juego.
- [ ] El botón "Jugar ahora" en `/game/[id]` navega a `/game/[id]/play`.
- [ ] `/game/[id]/play` muestra el HUD y la pantalla CRT, con la puntuación incrementándose automáticamente mientras no está en pausa ni terminado.
- [ ] Pulsar "Pausa" detiene el incremento de puntuación y muestra el overlay "EN PAUSA"; "Reanudar" lo retoma.
- [ ] Pulsar "Fin" abre el modal de fin de partida mostrando la puntuación final.
- [ ] Guardar la puntuación en el modal persiste un registro en `localStorage` y muestra el mensaje de confirmación.
- [ ] `/auth` permite alternar entre "Iniciar sesión" y "Crear cuenta", y ambos formularios, al enviarse, guardan un usuario mock en `localStorage`, actualizan el Nav y redirigen a `/`.
- [ ] "Jugar como invitado" en `/auth` navega a `/` sin crear sesión.
- [ ] Con sesión activa, el Nav muestra el nombre de usuario en vez del botón "Iniciar sesión"; cerrar sesión limpia `localStorage` y vuelve a mostrar el botón.
- [ ] `/hall-of-fame` muestra tabs por juego, podio (top 3) y tabla completa de puntuaciones para el juego seleccionado.
- [ ] Con sesión activa, `/hall-of-fame` muestra una fila adicional "tu mejor marca"; sin sesión, no aparece.
- [ ] El menú hamburguesa funciona en viewport móvil (< 840px) y da acceso a las mismas rutas que el Nav de escritorio.
- [ ] No quedan restos visuales del boilerplate de `create-next-app` (logos de Next.js/Vercel, textos por defecto) en ninguna ruta.
- [ ] El proyecto compila y corre sin errores de consola en las 5 rutas (`npm run dev`).

## Decisions

- **Sí:** rutas reales de App Router en inglés (`/game/[id]`, `/game/[id]/play`, `/auth`, `/hall-of-fame`) en vez del hash-routing del prototipo. Next.js ya resuelve navegación e historial; mantener hash-routing sería reinventar algo que el framework da gratis.
- **No:** mantener el hash-routing del prototipo original. Rompería con las convenciones de App Router y con lo indicado en `AGENTS.md`/`CLAUDE.md` sobre no asumir comportamiento heredado.
- **Sí:** textos de interfaz en español, segmentos de URL en inglés. Decisión explícita del usuario; separa idioma de contenido de convención técnica de rutas.
- **Sí:** datos ficticios en `app/data/`, separados por entidad (`games.ts`, `players.ts`, `scores.ts`). Decisión explícita del usuario, pensando en el reemplazo futuro por una base de datos real.
- **Sí:** componentes de UI en `app/components/`. Decisión explícita del usuario (frente a la alternativa `app/_components/`).
- **Sí:** mantener la simulación visual del reproductor (ticker de puntuación falso, animaciones CSS) tal como está en el prototipo. Decisión explícita del usuario: es puramente visual/CSS, no es lógica de juego real, y el spec solo prohíbe implementar juegos reales.
- **Sí:** mock de sesión y puntuaciones vía `localStorage`, igual que el prototipo. Decisión explícita del usuario; evita construir backend/autenticación real en un MVP que es "solo visual".
- **No:** implementar autenticación real (OAuth, backend, base de datos). Fuera del alcance de un MVP visual; los botones sociales quedan como decoración.
- **Sí:** reutilizar tal cual el CSS ya migrado en `app/globals.css` (proviene de `references/templates/styles.css` y ya fue portado en un commit anterior). No se reconstruye con utilidades de Tailwind para no arriesgar fidelidad visual frente al prototipo.

## What is **not** in this spec

- Lógica real de cualquiera de los 8 juegos del catálogo.
- Backend, API o base de datos reales — `app/data/` es un reemplazo temporal explícito.
- Autenticación real (OAuth, verificación de contraseña, backend de usuarios).
- Persistencia real de puntuaciones más allá del mock en `localStorage`.
- Tests automatizados.
- Multijugador o partidas en tiempo real.

Cada uno de estos, si se implementa, va en su propio spec.

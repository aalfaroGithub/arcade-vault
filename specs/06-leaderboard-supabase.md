# SPEC 06 — Leaderboard y catálogo real en Supabase

> **Status:** Approved
> **Depends on:** 04-supabase-integration, 05-asteroids-real
> **Date:** 2026-07-31
> **Objective:** Crear las tablas `games` y `scores` en Supabase (solo con el registro de Asteroids), y conectar el guardado de puntuaciones, el Salón de la Fama (tab Asteroids) y el leaderboard del detalle de Asteroids a datos reales en vez de mock/localStorage.

## Scope

**In:**

- Tabla `games` en Supabase (espejo de campos de `games.ts`: id, title, short, long, cat, cover, color, best, plays), con una sola fila (`id: "asteroids"`).
- Tabla `scores` en Supabase (`game_id` FK -> `games.id`, `user_id` uuid nullable, `name`, `score`, `created_at`), RLS pública (select+insert para anon).
- `GamePlayer.tsx`: al guardar puntuación de Asteroids, hace insert a Supabase `scores` en vez de `localStorage` `av_scores` (localStorage se deja de escribir para asteroids).
- `/game/asteroids` (detalle): el `Leaderboard` lee top puntuaciones reales de Supabase para `game_id='asteroids'`.
- `/hall-of-fame`: tab ASTEROIDS lee de Supabase (podio + tabla + "tu mejor marca" real por nombre de `av_user`); los otros 7 tabs siguen con `seededScores` sin cambios.
- Podio y tabla manejan el caso de <3 filas reales (mensaje "aún no hay puntuaciones").

**Out of scope (para specs futuros):**

- Los otros 7 juegos (siguen 100% mock, sin fila en `games` ni en `scores`).
- Autenticación real de Supabase / RLS restringido (queda público, se endurece en spec futura).
- Migrar datos existentes de `localStorage` `av_scores` hacia Supabase.
- Vista de tabla para la biblioteca `/games` (grilla de `GameCard` sin cambios).
- Tests automatizados (no hay test runner configurado).

## Data model

```sql
create table games (
  id text primary key,
  title text not null,
  short text not null,
  long text not null,
  cat text not null,
  cover text not null,
  color text not null,
  best integer not null default 0,
  plays text not null default '0'
);

create table scores (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references games(id),
  user_id uuid null references auth.users(id),
  name text not null,
  score integer not null,
  created_at timestamptz not null default now()
);

alter table games enable row level security;
alter table scores enable row level security;
create policy "public read games" on games for select using (true);
create policy "public read scores" on scores for select using (true);
create policy "public insert scores" on scores for insert with check (true);

insert into games (id, title, short, long, cat, cover, color, best, plays) values (
  'asteroids',
  'ASTEROIDS',
  'Pulveriza asteroides en gravedad cero.',
  'Tu nave triangular flota en vacío absoluto. Dispara y rota para dividir asteroides en fragmentos cada vez más pequeños. Recoge el power-up de triple disparo y sobrevive tantos niveles como puedas.',
  'SHOOTER',
  'cover-asteroids',
  'yellow',
  41200,
  '15.6K'
);
```

```ts
// lib/supabase/types.ts (nuevo)
export interface GameRow {
  id: string;
  title: string;
  short: string;
  long: string;
  cat: string;
  cover: string;
  color: string;
  best: number;
  plays: string;
}

export interface ScoreRow {
  id: string;
  game_id: string;
  user_id: string | null;
  name: string;
  score: number;
  created_at: string;
}
```

```ts
// lib/supabase/queries.ts (nuevo)
import type { ScoreRow } from "./types";

export async function insertScore(
  gameId: string,
  name: string,
  score: number,
): Promise<void>;

export async function getTopScores(
  gameId: string,
  limit: number,
): Promise<ScoreRow[]>;

export async function getPlayerBest(
  gameId: string,
  name: string,
): Promise<ScoreRow | null>;
```

`user_id` queda `null` en el insert por ahora (no hay Auth real de Supabase todavía, solo el nombre en `localStorage` `av_user`).

## Implementation plan

1. Crear migración Supabase (`games`, `scores`, RLS) e insertar la fila de Asteroids en `games` (con los mismos valores que su registro en `games.ts`).
2. Crear `lib/supabase/types.ts` con `GameRow` y `ScoreRow` (espejo de las columnas de las tablas).
3. Crear `lib/supabase/queries.ts` con `insertScore`, `getTopScores`, `getPlayerBest`, usando `GameRow`/`ScoreRow` de `types.ts` y el cliente browser (`lib/supabase/client.ts`).
4. Modificar `GamePlayer.tsx`: `saveScore()` para asteroids llama `insertScore('asteroids', name, score)` en vez de escribir en `av_scores`; el resto de juegos no cambia.
5. Modificar `app/game/asteroids/page.tsx`: reemplazar `seededScores` por `getTopScores('asteroids', 10)`.
6. Modificar `app/hall-of-fame/page.tsx`: cuando `tab === 'asteroids'`, cargar datos reales (`getTopScores`, `getPlayerBest` si hay `av_user`) en vez de `seededScores`/cálculo falso; los demás tabs siguen igual.
7. Adaptar `HallOfFamePodium.tsx` y `HallOfFameTable.tsx` (o el wrapper que los llama) para manejar <3 filas mostrando "Aún no hay puntuaciones" en vez de asumir 3 filas fijas.
8. Prueba manual: aplicar la migración en Supabase, jugar una partida real de asteroids, guardar puntuación, confirmar que aparece en `/game/asteroids` y en el tab Asteroids de `/hall-of-fame`, y que con <3 registros no se rompe el podio.

## Acceptance criteria

- [ ] Existen las tablas `games` y `scores` en Supabase, con RLS habilitado y policies públicas de select (ambas) e insert (scores).
- [ ] La tabla `games` tiene exactamente 1 fila (`id: "asteroids"`) con los mismos valores que su registro en `games.ts`.
- [ ] Jugar una partida de Asteroids y guardar la puntuación inserta una fila en `scores` (`game_id='asteroids'`, `name`, `score`, `user_id=null`) y ya NO escribe en `localStorage` `av_scores`.
- [ ] `/game/asteroids` muestra el leaderboard con las puntuaciones reales de Supabase (no `seededScores`), ordenadas de mayor a menor.
- [ ] `/hall-of-fame`, tab ASTEROIDS, muestra podio + tabla con datos reales de Supabase; los otros 7 tabs siguen mostrando `seededScores` sin cambios.
- [ ] Con menos de 3 puntuaciones reales guardadas, el tab ASTEROIDS de `/hall-of-fame` muestra "Aún no hay puntuaciones" en vez de romper (crash) el podio.
- [ ] Si hay un `av_user` guardado y tiene al menos una puntuación real en asteroids, el tab ASTEROIDS muestra "TU MEJOR MARCA" con su score real; si no tiene ninguna, esa sección no se muestra.
- [ ] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/game/asteroids`, `/game/asteroids/play` y `/hall-of-fame`.

## Decisions

- **Sí:** tabla `games` en Supabase convive con `games.ts` en vez de reemplazarlo. Decisión explícita — solo Asteroids tiene datos reales hoy; migrar el catálogo completo se evaluará cuando más juegos tengan lógica real.
- **Sí:** `games` espeja todos los campos de `games.ts` (no solo id/title). Decisión explícita del usuario.
- **Sí:** `scores.id` y `scores.user_id` son `uuid` (`user_id` nullable, referencia futura a `auth.users`). Decisión explícita — prepara el terreno para Auth real sin bloquear esta spec.
- **Sí:** tipos `GameRow`/`ScoreRow` viven en `lib/supabase/types.ts` separado de `queries.ts`. Decisión explícita del usuario, separa contratos de datos de la lógica de acceso.
- **Sí:** RLS público (select+insert sin restricción) en ambas tablas. Decisión explícita — no hay Auth real todavía; se endurece en spec futura.
- **Sí:** el guardado de Asteroids reemplaza `localStorage` por Supabase (no ambos). Decisión explícita del usuario.
- **No:** migrar registros existentes de `av_scores` (localStorage) hacia Supabase. Se aceptan como huérfanos, igual que se decidió con `game: "rocas"` en spec 05.
- **No:** tocar los otros 7 juegos (ni su tab en Salón de la Fama, ni tabla `games`/`scores`). Fuera de alcance hasta que tengan lógica real.
- **No:** diseñar Auth real de Supabase en esta spec. `user_id` queda preparado pero null; se resuelve en spec futura.

## Identified risks

- **RLS público permite trampas:** cualquiera con la publishable key puede insertar puntuaciones falsas directamente (sin pasar por el juego). Aceptado por ahora (ver Decisiones); se mitiga cuando exista Auth real.
- **Matching de "tu mejor marca" por nombre de texto:** si dos jugadores usan el mismo nombre en `av_user`, `getPlayerBest` puede mostrar la marca de otro. Aceptado — no hay identidad real todavía (`user_id` queda null).
- **Consultas asíncronas nuevas en Server Components:** `getTopScores`/`getPlayerBest` agregan latencia de red real (antes era cálculo local instantáneo). Mitigación: son consultas simples con `limit`, sin joins pesados.
- **Tabla `scores` vacía en producción recién desplegada:** hasta que alguien juegue y guarde, el leaderboard de asteroids estará vacío. Cubierto explícitamente por el criterio de aceptación de <3 filas.

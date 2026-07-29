# SPEC 04 — Integración base de Supabase

> **Status:** Implemented
> **Depends on:** —
> **Date:** 2026-07-29
> **Objective:** Integrar el SDK de Supabase en la aplicación Next.js (clientes browser y server, variables de entorno, endpoint de diagnóstico) sin implementar Auth ni crear tablas.

## Scope

**In:**

- Instalar la dependencia `@supabase/supabase-js`.
- Variables de entorno `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` agregadas a `.env.template` (placeholders) y a `.env.local` (valores reales, no versionado; `.env*` ya está en `.gitignore`).
- Helper de cliente para Client Components: `lib/supabase/client.ts`, exporta una función `createClient()` que instancia el cliente browser con `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Helper de cliente para Server Components / Route Handlers: `lib/supabase/server.ts`, exporta una función `createClient()` (async, siguiendo el patrón `@supabase/ssr` con manejo de cookies) que instancia el cliente server-side.
- Instalar la dependencia `@supabase/ssr` (necesaria para el helper server-side con cookies, patrón oficial recomendado por Supabase para Next.js App Router).
- Route Handler de diagnóstico `app/api/health/supabase/route.ts` (GET): usa el cliente server, ejecuta una llamada trivial (`auth.getSession()`) y devuelve `{ ok: true }` o `{ ok: false, error }` con el status HTTP correspondiente.

**Out of scope (para specs futuros):**

- Autenticación de usuarios (login, signup, sesiones, `app/auth/page.tsx` no se modifica).
- Creación de tablas, migraciones o cualquier esquema en la base de datos Supabase.
- Cualquier query de negocio (juegos, puntuaciones, jugadores) contra Supabase — `app/data/*.ts` sigue siendo la única fuente de datos por ahora.
- Row Level Security (RLS) o políticas — no aplica sin tablas.
- Middleware/`proxy` de Next.js para refresco de sesión (solo es necesario una vez haya Auth).
- Tests automatizados (no hay test runner configurado).

## Data model

No se introducen tipos de dominio nuevos en `app/data/` (el modelo `Game`, `ScoreEntry`, `PLAYERS`, etc. no cambia). Solo se define el contrato del endpoint de diagnóstico, local a `app/api/health/supabase/route.ts`:

```ts
// app/api/health/supabase/route.ts
type SupabaseHealthResponse = { ok: true } | { ok: false; error: string }; // mensaje genérico, sin detalles internos
```

Los helpers `lib/supabase/client.ts` y `lib/supabase/server.ts` no introducen tipos propios; ambos retornan el tipo `SupabaseClient` provisto por `@supabase/supabase-js`.

## Implementation plan

1. Instalar dependencias: `npm install @supabase/supabase-js @supabase/ssr`.
2. Agregar a `.env.template` los placeholders `NEXT_PUBLIC_SUPABASE_URL=XXXXXX` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=XXXXXX`; agregar los valores reales a `.env.local` (no versionado).
3. Crear `lib/supabase/client.ts` con `createClient()` usando `createBrowserClient` de `@supabase/ssr`, leyendo `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. Crear `lib/supabase/server.ts` con `createClient()` (async) usando `createServerClient` de `@supabase/ssr` y el manejo de cookies vía `next/headers`, siguiendo el patrón oficial para Route Handlers/Server Components de Next.js App Router.
5. Crear `app/api/health/supabase/route.ts` con un `GET` handler: instancia el cliente server (`lib/supabase/server.ts`), llama a `auth.getSession()`, y responde `{ ok: true }` (200) si no hay error, o `{ ok: false, error }` (500) si Supabase devuelve error o lanza excepción, sin exponer detalles internos.
6. Prueba manual: correr `npm run dev`, visitar `/api/health/supabase` y confirmar que responde `{ ok: true }` con las credenciales reales configuradas en `.env.local`.

## Acceptance criteria

- [x] `npm install @supabase/supabase-js @supabase/ssr` agrega ambas dependencias al `package.json`.
- [x] `.env.template` incluye los placeholders `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- [x] `.env.local` con los valores reales no queda versionado (confirmado por `.gitignore` existente `.env*`).
- [x] Existe `lib/supabase/client.ts` exportando `createClient()` para uso en Client Components.
- [x] Existe `lib/supabase/server.ts` exportando `createClient()` (async) para uso en Server Components/Route Handlers.
- [x] Existe `app/api/health/supabase/route.ts` con un `GET` handler.
- [x] Visitar `/api/health/supabase` con `npm run dev` y credenciales válidas en `.env.local` responde `{ ok: true }` (200).
- [ ] Si las credenciales son inválidas o falta la env var, el endpoint responde `{ ok: false, error }` (500) sin exponer stack ni detalles internos de Supabase. _(no verificado manualmente en esta sesión)_
- [x] El proyecto compila y corre sin errores de consola (`npm run dev`) en todas las rutas existentes, incluyendo `app/auth/page.tsx` (sin cambios).

## Decisions

- **Sí:** se usa `@supabase/ssr` (patrón oficial de Supabase para Next.js App Router) en vez de instanciar el cliente directamente con `@supabase/supabase-js` en el server. Mantiene consistencia con el patrón recomendado por Supabase aunque todavía no haya Auth, evitando reescribir los helpers cuando se agregue en una spec futura.
- **Sí:** se crean dos helpers separados (`lib/supabase/client.ts` y `lib/supabase/server.ts`) en vez de uno solo. Decisión explícita del usuario — necesita ambos contextos (browser y server) disponibles desde ya.
- **Sí:** endpoint de diagnóstico como Route Handler permanente (`app/api/health/supabase`) en vez de script de prueba desechable. Decisión explícita del usuario — queda como herramienta de diagnóstico reutilizable.
- **Sí:** se usan los nombres `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (nomenclatura actual de Supabase, reemplaza el antiguo `ANON_KEY`). Decisión explícita del usuario.
- **No:** Auth (login, signup, sesiones, middleware de refresco). Explícitamente fuera de alcance por el usuario; `app/auth/page.tsx` no se toca.
- **No:** creación de tablas, migraciones o RLS. Explícitamente fuera de alcance por el usuario; se hará en spec(s) futuras.
- **No:** queries de negocio contra Supabase (juegos, scores, jugadores). `app/data/*.ts` sigue siendo la fuente de datos actual.

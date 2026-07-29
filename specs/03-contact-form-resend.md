# SPEC 03 — Envío real del formulario de contacto con Resend

> **Status:** Implemented
> **Depends on:** 02-home-about
> **Date:** 2026-07-28
> **Objective:** Implementar el envío real del formulario de contacto de `/about` mediante un Route Handler (`/api/contact`) que use Resend para notificar por correo al equipo, con estados de carga y error en la UI.

## Scope

**In:**

- Nuevo Route Handler `app/api/contact/route.ts` (POST): recibe `{ name, email, msg }`, valida en servidor (campos no vacíos, formato de email), llama a Resend para enviar un correo a `jrgandrescursos@gmail.com` con asunto fijo "Nuevo mensaje de contacto — Arcade Vault", `reply-to` = email del usuario, remitente `onboarding@resend.dev`, y devuelve éxito/error en JSON.
- Instalar dependencia `resend` (paquete oficial de Node/TS).
- Variable de entorno `RESEND_API_KEY` en `.env.local` (no versionado; `.env*` ya está en `.gitignore`).
- Actualizar `app/about/page.tsx`: el `onSubmit` agrega validación de formato de email (además de "no vacío"), hace `fetch("/api/contact", ...)`, maneja tres estados — `idle`, `loading` (botón deshabilitado con texto "ENVIANDO…"), `error` (mensaje inline bajo el botón + el formulario conserva los datos para reintentar) — y solo pasa a la terminal de éxito simulada (`sent`) si la API responde éxito.
- Manejo de errores en el Route Handler: si `RESEND_API_KEY` falta o Resend responde error, se captura y se devuelve un JSON de error con status apropiado (sin exponer detalles internos/stack en la respuesta).

**Out of scope (para specs futuros):**

- Confirmación por correo al usuario que llenó el formulario (solo se notifica al equipo).
- Persistencia de los mensajes de contacto (base de datos, `localStorage`, panel de administración).
- Rate limiting / protección anti-spam (captcha, límite de envíos).
- Dominio propio verificado en Resend (se usa el remitente de pruebas `onboarding@resend.dev`).
- Cualquier otro formulario o flujo de correo en el resto de la app.
- Tests automatizados (no hay test runner configurado).

## Data model

No se introducen tipos de dominio nuevos en `app/data/` (el modelo de datos del proyecto — `Game`, `ScoreEntry`, `PLAYERS`, etc. — no cambia). Se define únicamente el contrato del endpoint, local a `app/api/contact/route.ts`:

```ts
// app/api/contact/route.ts
interface ContactRequestBody {
  name: string;
  email: string;
  msg: string;
}

type ContactResponse = { ok: true } | { ok: false; error: string }; // mensaje genérico, sin detalles internos
```

`ContactForm` (ya existente en `app/about/page.tsx`) se reutiliza tal cual como el shape que se envía en el `fetch`.

## Implementation plan

1. Instalar la dependencia `resend` (`npm install resend`) y agregar `RESEND_API_KEY` a `.env.local` (creado localmente, no versionado).
2. Crear `app/api/contact/route.ts` con el `POST` handler: valida `name`/`email`/`msg` (no vacíos, `email` con formato válido), instancia el cliente de Resend con `process.env.RESEND_API_KEY`, envía el correo (`from: "onboarding@resend.dev"`, `to: "jrgandrescursos@gmail.com"`, `reply_to: email`, `subject: "Nuevo mensaje de contacto — Arcade Vault"`, cuerpo con `name`/`email`/`msg`), y responde `{ ok: true }` o `{ ok: false, error }` con el status HTTP correspondiente (400 validación, 500 fallo de envío).
3. Actualizar `app/about/page.tsx`: reemplazar el `onSubmit` actual (que solo hacía `setSent` local) por una versión async que valida formato de email client-side, gestiona estado `status: "idle" | "loading" | "error"` además del `sent` existente, llama a `fetch("/api/contact", { method: "POST", body: JSON.stringify(form) })`, y según la respuesta: éxito → `setSent(...)` (comportamiento actual), error/excepción → `status = "error"` con mensaje inline, sin perder los datos del formulario.
4. Actualizar el JSX del formulario: botón deshabilitado + texto "ENVIANDO…" cuando `status === "loading"`; bloque de mensaje de error inline (bajo el botón) cuando `status === "error"`.
5. Prueba manual end-to-end en `npm run dev`: enviar el formulario con `RESEND_API_KEY` válida y confirmar que llega el correo a `jrgandrescursos@gmail.com` con el `reply-to` correcto; simular un fallo (API key inválida o vacía) y confirmar que se muestra el estado de error sin romper la app.

## Acceptance criteria

- [x] `npm install resend` agrega la dependencia al `package.json`.
- [x] Existe `app/api/contact/route.ts` con un `POST` handler que valida `name`, `email` (formato válido) y `msg` no vacíos, devolviendo `400` con `{ ok: false, error }` si falla la validación.
- [x] Con `RESEND_API_KEY` válida, enviar el formulario en `/about` con todos los campos completos y email válido dispara un correo real a `jrgandrescursos@gmail.com`, con `reply-to` igual al email ingresado y asunto "Nuevo mensaje de contacto — Arcade Vault".
- [x] Si Resend falla (API key inválida/ausente, error de red, etc.), el endpoint responde `500` con `{ ok: false, error }` sin exponer detalles internos (stack, mensaje crudo de Resend).
- [x] En `/about`, mientras la request está en curso, el botón de envío se deshabilita y muestra "ENVIANDO…".
- [x] En `/about`, si el envío falla, se muestra un mensaje de error inline bajo el botón y el formulario conserva los datos ingresados (no se limpia, no avanza al estado "enviado").
- [x] En `/about`, enviar con un email de formato inválido (ej. `"abc"`) dispara la animación "shake" existente y no llama al endpoint.
- [x] En `/about`, solo se muestra la terminal de éxito simulada (`sent`) cuando la API respondió éxito, no antes.
- [x] `.env.local` con `RESEND_API_KEY` no queda versionado (confirmado por `.gitignore` existente `.env*`).
- [x] El proyecto compila y corre sin errores de consola (`npm run dev`) en `/about` y el resto de rutas.

## Decisions

- **Sí:** solo se notifica al equipo (`jrgandrescursos@gmail.com`); no se envía confirmación al usuario. Decisión explícita del usuario — mantiene el flujo simple, sin duplicar templates de correo.
- **Sí:** se usa un Route Handler (`app/api/contact/route.ts`) en vez de una Server Action. Decisión explícita del usuario; mantiene el envío de Resend explícitamente server-side y el contrato HTTP explícito, consistente con `fetch` desde el cliente.
- **Sí:** se usa el remitente de pruebas `onboarding@resend.dev` en vez de un dominio propio verificado. Decisión explícita del usuario — no hay dominio propio configurado en Resend todavía; queda fuera de scope verificarlo.
- **Sí:** el estado de "enviado" (terminal de éxito) solo se muestra tras confirmación real del servidor, reemplazando el comportamiento anterior (spec 02) donde era una simulación puramente visual sin backend. Decisión explícita del usuario.
- **Sí:** validación de formato de email tanto en cliente (antes de disparar el `fetch`) como en servidor (dentro del route handler), evitando llamadas innecesarias a Resend con datos inválidos.
- **No:** rate limiting o protección anti-spam (captcha, límites de envío). Descartado por estar fuera del alcance de esta spec; puede abordarse en una spec futura si se vuelve un problema real.
- **No:** persistencia de los mensajes de contacto en base de datos o `localStorage`. Igual que en spec 02, no hay panel/admin que consuma esos datos.

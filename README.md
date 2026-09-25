# PracticIA

Plataforma inteligente de acompañamiento para prácticas profesionales.

## Componentes

- `practicia-companion/`: frontend React/TanStack Start + PWA → Netlify.
- `backend-agent/`: backend Express + IA → Render.
- `supabase/schema.sql`: PostgreSQL, RLS, Storage, triggers y validación de asistencia.

## Inicio

Lee primero **[README-DESPLIEGUE.md](./README-DESPLIEGUE.md)**.

La asistencia utiliza geolocalización real y una segunda validación en Supabase. La hora de puntualidad se interpreta en `America/Lima`.

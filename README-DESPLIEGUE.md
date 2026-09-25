# PracticIA — Guía definitiva de despliegue

Esta es la versión preparada para pasar de desarrollo local a un despliegue real.
Trabaja siempre sobre una copia del proyecto y conserva el ZIP original como respaldo.

## 1. Estructura

```text
PracticIA-App/
├── practicia-companion/   # Frontend React/TanStack Start + PWA → Netlify
├── backend-agent/         # Backend Express + IA → Render
└── supabase/              # PostgreSQL + RLS + Storage + funciones
```

## 2. Comprobación local — primero

Desde VS Code, abre `PracticIA-App` y ejecuta:

```bash
cd practicia-companion
npm install
npm run build
```

Si el build termina correctamente, puedes continuar. Una alerta de `npm audit` no se corrige automáticamente con `--force`; primero se identifica la dependencia afectada.

Para el backend:

```bash
cd ../backend-agent
npm install
npm start
```

El backend usa el puerto `5000` por defecto. Para una prueba real necesita sus variables de entorno.

## 3. GitHub — un solo repositorio

Crea un repositorio privado llamado, por ejemplo, `PracticIA-App`.

Desde la carpeta raíz:

```bash
git init
git add .
git commit -m "PracticIA - versión inicial para despliegue"
git branch -M main
git remote add origin TU_REPOSITORIO_GITHUB
git push -u origin main
```

No subas `.env` ni claves. Los `.env.example` sí se pueden subir.

## 4. Supabase

1. Crea un proyecto nuevo.
2. Abre **SQL Editor → New query**.
3. Copia todo `supabase/schema.sql` y ejecútalo.
4. En **Authentication**, configura Email y evita el registro público si las cuentas serán administradas desde PracticIA.
5. En **Storage**, conserva `evidencias_practica` como bucket privado.
6. En **Authentication → URL Configuration**, configura la URL final de Netlify cuando ya exista.

### Claves que debes guardar

- Project URL
- anon/public key
- service_role key — **secreta, solo backend/Render**

## 5. Datos iniciales

Crea primero un usuario administrador en Supabase Auth, confirma su correo y asegúrate de que su fila en `perfiles` tenga `rol = 'admin'`.

Luego, desde PracticIA:

1. Instituciones.
2. Docentes.
3. Estudiantes.
4. Asignación estudiante → docente.
5. Prácticas.

Cada institución usada para asistencia debe tener **latitud, longitud y un radio positivo**. La base de datos rechaza la asistencia si faltan coordenadas.

## 6. Render — backend

Crea un **Web Service** conectado al repositorio `PracticIA-App`.

Configuración:

- Root Directory: `backend-agent`
- Runtime: Node
- Build Command: `npm install`
- Start Command: `npm start`

Variables:

```text
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
GEMINI_API_KEY=...
GROQ_API_KEY=...
OPENROUTER_API_KEY=...
FRONTEND_URL=https://TU-SITIO.netlify.app
```

Opcionales para controlar modelos sin modificar código:

```text
GEMINI_MODELS=gemini-3.8-flash,gemini-3.7-flash,gemini-3-flash-preview
GROQ_MODELS=openai/gpt-oss-120b,openai/gpt-oss-20b
OPENROUTER_MODELS=openai/gpt-oss-120b:free,openai/gpt-oss-20b:free
```

Comprueba:

```text
https://TU-BACKEND.onrender.com/health
```

Debe responder JSON con `ok: true` y mostrar qué proveedores de IA y Supabase están configurados.

## 7. Netlify — frontend

Conecta el mismo repositorio de GitHub.

Configuración:

- Base directory: `practicia-companion`
- Build command: `npm run build`
- Publish directory: `.output/public`

Variables públicas del frontend:

```text
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_BACKEND_URL=https://TU-BACKEND.onrender.com
```

**Nunca** pongas aquí `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, `GROQ_API_KEY` ni `OPENROUTER_API_KEY`.

## 8. Conectar los servicios

Cuando Netlify entregue la URL definitiva:

1. Actualiza `FRONTEND_URL` en Render.
2. En Supabase → Authentication → URL Configuration, coloca la URL de Netlify como Site URL.
3. Agrega la misma URL a Redirect URLs.
4. Redeploya Render y Netlify si corresponde.

## 9. Prueba final

### Estudiante

- Iniciar sesión.
- Ver práctica.
- GPS desactivado → no registra.
- Institución sin coordenadas → no registra.
- Fuera del radio → no registra.
- Dentro del radio → permite tomar foto y registrar.
- Revisar que aparezcan distancia y puntualidad.

### Docente

- Ver estudiante asignado.
- Ver práctica.
- Ver asistencia.
- Ver fotografía/evidencia.
- Recibir notificación.
- Revisar sesión y anecdotario.

### Administrador

- Gestionar usuarios.
- Gestionar instituciones.
- Configurar coordenadas/radio/tolerancias.
- Programar prácticas.
- Revisar reportes.
- Descargar XLSX/PDF.

### IA

- Probar asistente.
- Probar revisión de una sesión PDF.
- Confirmar que el backend responde y que la cascada usa un proveedor disponible.

### Móvil

La prueba de GPS y cámara debe hacerse en un teléfono real mediante HTTPS (Netlify), no solo en `localhost`.

## 10. Correcciones incluidas en esta versión

1. La interfaz exige que la evaluación de geocerca sea exactamente `dentro === true` antes de permitir continuar.
2. La función SQL `registrar_asistencia()` bloquea prácticas sin institución válida, sin latitud/longitud o con radio inválido.
3. La distancia se calcula nuevamente en Supabase mediante Haversine.
4. La puntualidad usa explícitamente `America/Lima`.
5. Se conserva la evidencia fotográfica y no se implementa todavía reconocimiento automático de la imagen.
6. El análisis completo con IA se mantiene orientado a PDF por ahora.
7. Los reportes XLSX se mantienen.
8. Las claves de IA permanecen en backend/Render.
9. Los modelos por defecto del backend fueron actualizados a modelos actualmente documentados por los proveedores; pueden cambiarse mediante variables de entorno.

## 11. Qué NO se modifica ahora

- No se agrega reconocimiento automático de fotografía.
- No se elimina automáticamente una foto de un intento rechazado.
- No se añade procesamiento completo DOC/DOCX.
- No se rehace la interfaz visual.
- No se añaden nuevas funcionalidades antes de probar el despliegue.

import express from 'express';
import cors from 'cors';
import crypto from 'node:crypto';
import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';

const app = express();
const PORT = process.env.PORT || 5000;
app.disable('x-powered-by');

/* ------------------------------------------------------------------ */
/* Configuración                                                       */
/* ------------------------------------------------------------------ */
const env = (k) => (process.env[k] ? String(process.env[k]).trim() : '');
const list = (v, def) => (v ? v : def).split(',').map((s) => s.trim()).filter(Boolean);

const SUPABASE_URL = env('SUPABASE_URL').replace(/\/+$/, '');
const SERVICE_KEY = env('SUPABASE_SERVICE_ROLE_KEY');

// Modelos configurables por variable de entorno (los modelos de IA cambian seguido).
// Se prueban en orden; si uno falla o ya no existe, pasa al siguiente.
const GEMINI_MODELS = list(env('GEMINI_MODELS'), 'gemini-3.8-flash,gemini-3.7-flash,gemini-3-flash-preview');
const GROQ_MODELS = list(env('GROQ_MODELS'), 'openai/gpt-oss-120b,openai/gpt-oss-20b');
const OPENROUTER_MODELS = list(
  env('OPENROUTER_MODELS'),
  'openai/gpt-oss-120b:free,openai/gpt-oss-20b:free',
);

const geminiKey = env('GEMINI_API_KEY');
const groqKey = env('GROQ_API_KEY');
const openRouterKey = env('OPENROUTER_API_KEY');
const aiGemini = geminiKey ? new GoogleGenAI({ apiKey: geminiKey }) : null;
const groqClient = groqKey ? new Groq({ apiKey: groqKey }) : null;

const allowedOrigins = new Set(
  [
    'http://localhost:8080',
    'http://localhost:5173',
    'https://practicia-app.netlify.app',
    ...env('FRONTEND_URL').split(',').map((s) => s.trim().replace(/\/+$/, '')),
  ].filter(Boolean),
);

app.use(
  cors({
    origin(origin, cb) {
      // Sin Origin (curl, health checks de Render) → permitido; con Origin → debe estar en la lista.
      if (!origin || allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  }),
);
// El PDF de una sesión llega en base64 (≤ 8 MB de archivo ≈ 11 MB de texto)
app.use(express.json({ limit: '12mb' }));

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const clip = (v, max) => (typeof v === 'string' ? v.slice(0, max) : '');
const fail = (res, status, error) => res.status(status).json({ exito: false, error });

/** Límite simple en memoria: N peticiones por minuto por usuario y ruta. */
const hits = new Map();
function rateLimit(name, max) {
  return (req, res, next) => {
    const key = `${name}:${req.user?.id ?? req.ip}`;
    const now = Date.now();
    const arr = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
    if (arr.length >= max) return fail(res, 429, 'Demasiadas solicitudes. Espera un minuto e inténtalo de nuevo.');
    arr.push(now);
    hits.set(key, arr);
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, arr] of hits) {
    const fresh = arr.filter((t) => now - t < 60_000);
    if (fresh.length) hits.set(k, fresh);
    else hits.delete(k);
  }
}, 5 * 60_000).unref();

/* ------------------------------------------------------------------ */
/* Autenticación con el token de Supabase                              */
/* ------------------------------------------------------------------ */
const sbHeaders = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  ...extra,
});

const userCache = new Map(); // token → { user, exp }

async function resolveUser(token) {
  const cached = userCache.get(token);
  if (cached && cached.exp > Date.now()) return cached.user;

  // 1) ¿El token es válido? (lo verifica Supabase Auth)
  const r = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { apikey: SERVICE_KEY, Authorization: `Bearer ${token}` },
  });
  if (!r.ok) return null;
  const authUser = await r.json();
  if (!authUser?.id) return null;

  // 2) Rol y estado reales desde `perfiles`
  const p = await fetch(
    `${SUPABASE_URL}/rest/v1/perfiles?id=eq.${authUser.id}&select=id,rol,estado,email`,
    { headers: sbHeaders() },
  );
  if (!p.ok) return null;
  const rows = await p.json();
  const perfil = rows?.[0];
  if (!perfil || perfil.estado === 'Inactivo') return null;

  const user = { id: perfil.id, rol: perfil.rol, email: perfil.email };
  userCache.set(token, { user, exp: Date.now() + 60_000 });
  if (userCache.size > 500) userCache.delete(userCache.keys().next().value);
  return user;
}

async function requireUser(req, res, next) {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    return fail(res, 500, 'El servidor no tiene configurado Supabase (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).');
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return fail(res, 401, 'Debes iniciar sesión.');
  try {
    const user = await resolveUser(token);
    if (!user) return fail(res, 401, 'Sesión inválida o cuenta inactiva.');
    req.user = user;
    next();
  } catch (e) {
    console.error('Error verificando sesión:', e.message);
    return fail(res, 502, 'No se pudo verificar tu sesión. Inténtalo de nuevo.');
  }
}

const requireAdmin = (req, res, next) =>
  req.user?.rol === 'admin' ? next() : fail(res, 403, 'Solo el administrador puede hacer esto.');

/* ------------------------------------------------------------------ */
/* Cascada de IA: Gemini → Groq → OpenRouter                           */
/* ------------------------------------------------------------------ */
const errMsg = (e) => String(e?.message || e).slice(0, 200);

function geminiContents(historial, mensaje) {
  const contents = [];
  for (const m of historial) {
    const role = m.rol === 'user' ? 'user' : 'model';
    if (contents.length === 0 && role === 'model') continue; // Gemini exige empezar por 'user'
    if (contents.length && contents[contents.length - 1].role === role) {
      contents[contents.length - 1].parts[0].text += `\n${m.texto}`;
    } else {
      contents.push({ role, parts: [{ text: m.texto }] });
    }
  }
  if (contents.length && contents[contents.length - 1].role === 'user') {
    contents[contents.length - 1].parts[0].text += `\n${mensaje}`;
  } else {
    contents.push({ role: 'user', parts: [{ text: mensaje }] });
  }
  return contents;
}

const chatMessages = (promptSistema, historial, mensaje) => [
  ...(promptSistema ? [{ role: 'system', content: promptSistema }] : []),
  ...historial.map((m) => ({ role: m.rol === 'user' ? 'user' : 'assistant', content: m.texto })),
  { role: 'user', content: mensaje },
];

async function askGemini({ mensaje, promptSistema, historial, parts, json }) {
  if (!aiGemini) return null;
  for (const model of GEMINI_MODELS) {
    try {
      const response = await aiGemini.models.generateContent({
        model,
        contents: parts ? [{ role: 'user', parts }] : geminiContents(historial, mensaje),
        config: {
          ...(promptSistema ? { systemInstruction: promptSistema } : {}),
          ...(json ? { responseMimeType: 'application/json' } : {}),
        },
      });
      const text = response?.text || response?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) return { texto: text, proveedor: `Gemini (${model})` };
    } catch (e) {
      console.warn(`⚠️ Gemini ${model} falló: ${errMsg(e)}`);
    }
  }
  return null;
}

async function askGroq({ mensaje, promptSistema, historial, json }) {
  if (!groqClient) return null;
  for (const model of GROQ_MODELS) {
    try {
      const completion = await groqClient.chat.completions.create({
        model,
        messages: chatMessages(promptSistema, historial, mensaje),
        ...(json ? { response_format: { type: 'json_object' } } : {}),
      });
      const text = completion.choices?.[0]?.message?.content;
      if (text) return { texto: text, proveedor: `Groq (${model})` };
    } catch (e) {
      console.warn(`⚠️ Groq ${model} falló: ${errMsg(e)}`);
    }
  }
  return null;
}

async function askOpenRouter({ mensaje, promptSistema, historial }) {
  if (!openRouterKey) return null;
  for (const model of OPENROUTER_MODELS) {
    try {
      const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${openRouterKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ model, messages: chatMessages(promptSistema, historial, mensaje) }),
      });
      const data = await r.json();
      const text = data.choices?.[0]?.message?.content;
      if (text) return { texto: text, proveedor: `OpenRouter (${model})` };
      console.warn(`⚠️ OpenRouter ${model} sin respuesta: ${errMsg(data?.error?.message || r.status)}`);
    } catch (e) {
      console.warn(`⚠️ OpenRouter ${model} falló: ${errMsg(e)}`);
    }
  }
  return null;
}

async function cascada(opts) {
  return (await askGemini(opts)) || (await askGroq(opts)) || (await askOpenRouter(opts));
}

/* ------------------------------------------------------------------ */
/* Rutas                                                               */
/* ------------------------------------------------------------------ */
app.get('/', (_req, res) => res.json({ ok: true, servicio: 'PracticIA backend' }));

// Sin autenticación y solo con booleanos: sirve de "ping" y para la pantalla de Configuración.
app.get('/health', (_req, res) =>
  res.json({
    ok: true,
    ia: { gemini: !!aiGemini, groq: !!groqClient, openrouter: !!openRouterKey },
    supabase: !!(SUPABASE_URL && SERVICE_KEY),
  }),
);

app.post('/api/chat', requireUser, rateLimit('chat', 30), async (req, res) => {
  const mensaje = clip(req.body?.mensaje, 4000).trim();
  if (!mensaje) return fail(res, 400, 'El mensaje es obligatorio.');
  const promptSistema = clip(req.body?.promptSistema, 4000).trim();
  const historial = (Array.isArray(req.body?.historial) ? req.body.historial : [])
    .slice(-8)
    .map((m) => ({ rol: m?.rol === 'user' ? 'user' : 'assistant', texto: clip(m?.texto, 2000) }))
    .filter((m) => m.texto);

  const out = await cascada({ mensaje, promptSistema, historial });
  if (!out) {
    return fail(res, 503, 'El asistente no está disponible en este momento. Inténtalo de nuevo en unos minutos.');
  }
  console.log(`✔ chat · ${req.user.rol} · ${out.proveedor}`);
  return res.json({ exito: true, respuesta: out.texto, proveedor: out.proveedor });
});

const REVISION_SISTEMA = `Eres un asesor pedagógico que revisa sesiones de aprendizaje de estudiantes de formación docente (Perú, Currículo Nacional).
Analiza la sesión con criterio pedagógico: propósito de aprendizaje, competencias y desempeños, secuencia didáctica (inicio, desarrollo, cierre), materiales, atención a la diversidad e instrumentos de evaluación.
Responde ÚNICAMENTE con un objeto JSON válido, en español, con esta forma exacta:
{"resumen": string (2-3 oraciones), "fortalezas": string[] (2-4), "recomendaciones": string[] (3-5, accionables), "porRevisar": string[] (0-4, inconsistencias o faltantes detectados), "sugerencias": string[] (2-3, ideas prácticas)}
No inventes contenido que no aparezca en el documento. Tus observaciones son orientativas: la evaluación final es del docente.`;

function parseRevision(texto) {
  const limpio = String(texto).replace(/```json|```/gi, '').trim();
  const inicio = limpio.indexOf('{');
  const fin = limpio.lastIndexOf('}');
  const obj = JSON.parse(limpio.slice(inicio, fin + 1));
  const arr = (v, n) => (Array.isArray(v) ? v.map((x) => clip(String(x), 400)).filter(Boolean).slice(0, n) : []);
  const rev = {
    resumen: clip(String(obj.resumen ?? ''), 900),
    fortalezas: arr(obj.fortalezas, 5),
    recomendaciones: arr(obj.recomendaciones, 6),
    porRevisar: arr(obj.porRevisar, 5),
    sugerencias: arr(obj.sugerencias, 4),
  };
  if (!rev.resumen && rev.recomendaciones.length === 0) throw new Error('Respuesta vacía');
  return rev;
}

app.post('/api/analizar-sesion', requireUser, rateLimit('analisis', 8), async (req, res) => {
  const titulo = clip(req.body?.titulo, 200).trim();
  if (!titulo) return fail(res, 400, 'Falta el título de la sesión.');
  const b64 = typeof req.body?.archivoBase64 === 'string' ? req.body.archivoBase64 : '';
  const esPdf = req.body?.mimeType === 'application/pdf' && b64.length > 0 && b64.length < 11_500_000;

  let out = null;
  let soloTitulo = false;

  if (esPdf) {
    out = await askGemini({
      promptSistema: REVISION_SISTEMA,
      json: true,
      parts: [
        { inlineData: { mimeType: 'application/pdf', data: b64 } },
        { text: `Revisa esta sesión de aprendizaje titulada "${titulo}".` },
      ],
    });
  }
  if (!out) {
    // Sin poder leer el documento, se hace un análisis general por título y se advierte de ello.
    soloTitulo = true;
    out = await cascada({
      promptSistema: REVISION_SISTEMA,
      json: true,
      historial: [],
      mensaje: `Solo dispones del título de la sesión: "${titulo}". No inventes detalles del contenido; da orientaciones generales para esa temática y señala en "porRevisar" que no se pudo leer el documento.`,
    });
  }
  if (!out) return fail(res, 503, 'La IA no está disponible en este momento. Inténtalo de nuevo en unos minutos.');

  try {
    const revision = parseRevision(out.texto);
    if (soloTitulo) {
      revision.porRevisar.unshift(
        esPdf
          ? 'No fue posible leer el documento: este análisis se basa solo en el título de la sesión.'
          : 'Este análisis se basa solo en el título: para revisar el contenido, sube la sesión en PDF.',
      );
    }
    console.log(`✔ análisis · ${req.user.rol} · ${out.proveedor}${soloTitulo ? ' · solo título' : ''}`);
    return res.json({ exito: true, revision: { ...revision, proveedor: out.proveedor } });
  } catch (e) {
    console.error('No se pudo interpretar la respuesta de la IA:', errMsg(e));
    return fail(res, 502, 'La IA respondió en un formato inesperado. Inténtalo de nuevo.');
  }
});

/* ------------------------ Administración de usuarios ------------------------ */
const ROLES = new Set(['estudiante', 'docente', 'admin']);
const genPassword = () => {
  const abc = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => abc[b % abc.length]).join('') + '#7';
};

app.post('/api/admin/usuarios', requireUser, requireAdmin, rateLimit('admin', 30), async (req, res) => {
  const b = req.body || {};
  const correo = clip(b.correo, 200).trim().toLowerCase();
  const nombres = clip(b.nombres, 100).trim();
  const apellidos = clip(b.apellidos, 100).trim();
  const rol = String(b.rol);
  if (!/^\S+@\S+\.\S+$/.test(correo)) return fail(res, 400, 'Correo inválido.');
  if (!nombres) return fail(res, 400, 'Los nombres son obligatorios.');
  if (!ROLES.has(rol)) return fail(res, 400, 'Rol inválido.');
  const docenteId = UUID.test(b.docenteId || '') ? b.docenteId : null;
  const institucionId = UUID.test(b.institucionId || '') ? b.institucionId : null;

  const password = typeof b.password === 'string' && b.password.length >= 8 ? b.password : genPassword();

  try {
    // 1) Cuenta en Supabase Auth
    const a = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: 'POST',
      headers: sbHeaders(),
      body: JSON.stringify({ email: correo, password, email_confirm: true, user_metadata: { nombres, apellidos } }),
    });
    const created = await a.json();
    if (!a.ok) {
      const msg = String(created?.msg || created?.message || created?.error_description || '');
      if (/already|registered|exists/i.test(msg)) return fail(res, 409, 'Ya existe una cuenta con ese correo.');
      return fail(res, 400, msg || 'No se pudo crear la cuenta.');
    }

    // 2) Perfil (la fila que gobierna el rol y los permisos)
    const p = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?on_conflict=id`, {
      method: 'POST',
      headers: sbHeaders({ Prefer: 'resolution=merge-duplicates,return=minimal' }),
      body: JSON.stringify({
        id: created.id,
        email: correo,
        nombres,
        apellidos,
        nombre_completo: `${nombres} ${apellidos}`.trim(),
        rol,
        estado: 'Activo',
        programa: clip(b.programa, 100).trim() || null,
        ciclo: clip(b.ciclo, 20).trim() || null,
        docente_id: rol === 'estudiante' ? docenteId : null,
        institucion_id: institucionId,
      }),
    });
    if (!p.ok) {
      // Se deshace la cuenta para no dejar usuarios "huérfanos" sin perfil
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${created.id}`, { method: 'DELETE', headers: sbHeaders() });
      console.error('Error creando perfil:', await p.text());
      return fail(res, 500, 'No se pudo crear el perfil del usuario. Revisa que ejecutaste supabase/schema.sql.');
    }
    console.log(`✔ usuario creado · ${rol} · por ${req.user.email}`);
    return res.status(201).json({ exito: true, id: created.id, passwordTemporal: password });
  } catch (e) {
    console.error('Error creando usuario:', errMsg(e));
    return fail(res, 502, 'No se pudo contactar a Supabase.');
  }
});

app.delete('/api/admin/usuarios/:id', requireUser, requireAdmin, rateLimit('admin', 30), async (req, res) => {
  const id = req.params.id;
  if (!UUID.test(id)) return fail(res, 400, 'Identificador inválido.');
  if (id === req.user.id) return fail(res, 400, 'No puedes eliminar tu propia cuenta.');
  try {
    // Perfil primero (en cascada borra sus prácticas, asistencias, sesiones…), luego la cuenta de Auth
    const p = await fetch(`${SUPABASE_URL}/rest/v1/perfiles?id=eq.${id}`, { method: 'DELETE', headers: sbHeaders() });
    if (!p.ok) return fail(res, 500, 'No se pudo eliminar el perfil.');
    const a = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: sbHeaders() });
    if (!a.ok && a.status !== 404) return fail(res, 500, 'Se eliminó el perfil pero no la cuenta de acceso.');
    userCache.clear();
    console.log(`✔ usuario eliminado · por ${req.user.email}`);
    return res.json({ exito: true });
  } catch (e) {
    console.error('Error eliminando usuario:', errMsg(e));
    return fail(res, 502, 'No se pudo contactar a Supabase.');
  }
});

/* ------------------------------------------------------------------ */
app.use((_req, res) => fail(res, 404, 'Ruta no encontrada.'));

// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err?.type === 'entity.too.large') return fail(res, 413, 'El archivo es demasiado grande.');
  if (/CORS/i.test(err?.message || '')) return fail(res, 403, 'Origen no permitido.');
  console.error('Error no controlado:', errMsg(err));
  return fail(res, 500, 'Error interno del servidor.');
});

app.listen(PORT, () => {
  console.log(`Backend de PracticIA activo en el puerto ${PORT}`);
  if (!SUPABASE_URL || !SERVICE_KEY) console.warn('⚠️ Falta SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY: las rutas protegidas no funcionarán.');
  if (!aiGemini && !groqClient && !openRouterKey) console.warn('⚠️ No hay ninguna clave de IA configurada.');
});

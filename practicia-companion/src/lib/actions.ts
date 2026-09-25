/**
 * Acciones de escritura de PracticIA. Cada función habla con Supabase (o con el backend
 * cuando hace falta la service_role) y termina refrescando los datos en pantalla.
 * Las reglas de seguridad reales viven en las políticas RLS del esquema SQL.
 */
import { supabase, BUCKET } from "./supabase";
import { apiFetch } from "@/services/api";
import {
  distanceMeters,
  fmtDate,
  fmtTime,
  refreshData,
  type AnecdoteStatus,
  type AiReview,
  type Institution,
  type LearningSession,
  type PracticeStatus,
  type Role,
} from "./data";

export const MAX_FILE_MB = 10;

/* ------------------------------ utilidades ------------------------------ */
function friendly(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("row-level security") || m.includes("permission denied")) return "No tienes permiso para realizar esta acción.";
  if (m.includes("jwt") || m.includes("not authenticated")) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (m.includes("duplicate key")) return "Ya existe un registro con esos datos.";
  if (m.includes("failed to fetch") || m.includes("network")) return "Sin conexión. Inténtalo de nuevo.";
  return message;
}

function check(error: { message: string } | null, contexto: string) {
  if (error) {
    console.error(`[PracticIA] ${contexto}:`, error);
    throw new Error(friendly(error.message));
  }
}

async function myId(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  if (!data.user) throw new Error("Tu sesión expiró. Vuelve a iniciar sesión.");
  return data.user.id;
}

function validateFile(file: File, allowed?: RegExp) {
  if (file.size > MAX_FILE_MB * 1024 * 1024) throw new Error(`El archivo supera los ${MAX_FILE_MB} MB.`);
  if (allowed && !allowed.test(file.type) && !allowed.test(file.name)) throw new Error("Formato de archivo no permitido.");
}

/** Sube un archivo al bucket privado, en la carpeta del usuario: <uid>/<carpeta>/<archivo>. */
export async function subirArchivo(file: File, carpeta: string): Promise<string> {
  const id = await myId();
  const safe = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .slice(-80);
  const path = `${id}/${carpeta}/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    ...(file.type ? { contentType: file.type } : {}),
    upsert: false,
  });
  check(error, "subir archivo");
  return path;
}

/** URL temporal (1 h) para ver/descargar un archivo privado. */
export async function urlFirmada(path?: string, expiraSeg = 3600): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiraSeg);
  if (error) {
    console.error("[PracticIA] urlFirmada:", error);
    return null;
  }
  return data.signedUrl;
}

export async function abrirArchivo(path?: string) {
  const url = await urlFirmada(path);
  if (!url) throw new Error("No se pudo abrir el archivo.");
  window.open(url, "_blank", "noopener,noreferrer");
}

const fileToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = () => reject(new Error("No se pudo leer el archivo."));
    r.readAsDataURL(blob);
  });

/* ------------------------------- ubicación ------------------------------ */
export interface Ubicacion {
  lat: number;
  lng: number;
  precision: number;
}

export function obtenerUbicacion(): Promise<Ubicacion> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Tu dispositivo no permite obtener la ubicación."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude, precision: pos.coords.accuracy }),
      (err) =>
        reject(
          new Error(
            err.code === err.PERMISSION_DENIED
              ? "Debes permitir el acceso a tu ubicación para registrar asistencia."
              : "No pudimos obtener tu ubicación. Activa el GPS e inténtalo de nuevo.",
          ),
        ),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

/**
 * Solo para PREVISUALIZAR en pantalla ("estás a X m") antes de tomar la foto.
 * Esto NO es la validación real: es únicamente para que el estudiante vea su
 * distancia mientras se acerca. La distancia que de verdad decide si la
 * asistencia se guarda o se rechaza se calcula otra vez, en el servidor,
 * dentro de la función registrar_asistencia() — así un usuario no puede
 * inventar coordenadas desde la consola del navegador para hacer trampa.
 */
export function evaluarUbicacion(u: Ubicacion | null, inst?: Institution) {
  const tieneCoords = !!inst && (inst.latitud !== 0 || inst.longitud !== 0);
  if (!u || !tieneCoords) return { distancia: null as number | null, dentro: null as boolean | null };
  const distancia = Math.round(distanceMeters(u.lat, u.lng, inst!.latitud, inst!.longitud));
  return { distancia, dentro: distancia <= inst!.radio };
}

/** Traduce los prefijos que devuelve registrar_asistencia() (Postgres) a un mensaje claro. */
function friendlyAsistenciaError(message: string): string {
  const m = message;
  if (m.includes("GPS_REQUERIDO")) return "Necesitamos tu ubicación para registrar la asistencia. Activa el GPS e inténtalo de nuevo.";
  if (m.includes("GPS_INVALIDO")) return "Tu dispositivo envió una ubicación inválida. Inténtalo de nuevo.";
  if (m.includes("INSTITUCION_REQUERIDA")) return "La práctica no tiene una institución válida asignada. Comunícate con el administrador.";
  if (m.includes("COORDENADAS_REQUERIDAS")) return "La institución todavía no tiene coordenadas GPS configuradas. Comunícate con el administrador.";
  if (m.includes("RADIO_INVALIDO")) return "La institución no tiene un radio de ubicación válido. Comunícate con el administrador.";
  if (m.includes("FUERA_DE_RANGO")) {
    const detalle = m.split("FUERA_DE_RANGO:")[1]?.trim();
    return detalle ? `Fuera del área permitida. ${detalle}` : "Estás fuera del área permitida para registrar tu asistencia.";
  }
  if (m.includes("YA_REGISTRADA")) return "Ya registraste tu asistencia para esta práctica.";
  if (m.includes("SIN_PERMISO")) return "Esta práctica no te pertenece.";
  if (m.includes("SIN_SESION")) return "Tu sesión expiró. Vuelve a iniciar sesión.";
  if (m.includes("PRACTICA_NO_ENCONTRADA")) return "No encontramos esta práctica.";
  return friendly(message);
}

/* -------------------------------- asistencia ----------------------------- */
export type AsistenciaRechazada = { motivo: "GPS_REQUERIDO" | "FUERA_DE_RANGO" | "OTRO"; mensaje: string };

/**
 * Registra la asistencia. El GPS es obligatorio: sin ubicación, o fuera del
 * radio de la institución, el servidor RECHAZA el registro (no se guarda
 * "Observada" ni "Pendiente" como antes — o entra, o no entra).
 */
export async function registrarAsistencia(input: {
  practicaId: string;
  institucion?: Institution;
  ubicacion: Ubicacion;
  foto: File;
}) {
  validateFile(input.foto, /^image\//);
  const uid = await myId();
  const fotoPath = await subirArchivo(input.foto, "asistencia");
  const ahora = new Date();

  const { data, error } = await supabase.rpc("registrar_asistencia", {
    p_practica: input.practicaId,
    p_lat: input.ubicacion.lat,
    p_lng: input.ubicacion.lng,
    p_foto_path: fotoPath,
  });

  if (error) {
    console.error("[PracticIA] registrar_asistencia:", error);
    const motivo: AsistenciaRechazada["motivo"] = error.message.includes("GPS_REQUERIDO")
      ? "GPS_REQUERIDO"
      : error.message.includes("FUERA_DE_RANGO")
        ? "FUERA_DE_RANGO"
        : "OTRO";
    throw Object.assign(new Error(friendlyAsistenciaError(error.message)), { motivo });
  }
  const fila = data as { puntualidad?: string; distancia_m?: number } | null;

  // La foto de llegada también queda en el repositorio de evidencias
  await supabase.from("evidencias").insert({
    estudiante_id: uid,
    practica_id: input.practicaId,
    tipo: "Registro de llegada",
    nombre: `Llegada ${fmtDate(ahora)}`,
    archivo_path: fotoPath,
    estado: "Pendiente",
  });

  await refreshData();
  return {
    puntualidad: (fila?.puntualidad ?? "Puntual") as "Temprano" | "Puntual" | "Tarde",
    distancia: fila?.distancia_m != null ? Math.round(fila.distancia_m) : null,
    fecha: fmtDate(ahora),
    hora: fmtTime(ahora),
  };
}

export async function marcarEnCamino(practicaId: string) {
  const { error } = await supabase.rpc("marcar_en_camino", { p_practica: practicaId });
  check(error, "marcar en camino");
  await refreshData();
}

export async function confirmarAsistencia(id: string, estado: "Confirmada" | "Observada") {
  const { error } = await supabase.from("asistencias").update({ estado }).eq("id", id);
  check(error, "actualizar asistencia");
  await refreshData();
}

/* --------------------------------- sesiones ------------------------------ */
export async function subirSesion(input: {
  titulo: string;
  file: File;
  practicaId?: string;
  /** Si se indica, sube una NUEVA VERSIÓN de esa sesión. */
  sesionId?: string;
}): Promise<string> {
  validateFile(input.file, /pdf|word|officedocument|\.pdf$|\.docx?$/i);
  const uid = await myId();
  const path = await subirArchivo(input.file, "sesiones");

  if (input.sesionId) {
    const { data: actual, error: e1 } = await supabase.from("sesiones").select("version").eq("id", input.sesionId).single();
    check(e1, "leer sesión");
    const { error } = await supabase
      .from("sesiones")
      .update({
        archivo_path: path,
        archivo_nombre: input.file.name,
        version: (actual?.version ?? 1) + 1,
        estado: "Pendiente de revisión IA",
        recomendaciones_ia: null,
      })
      .eq("id", input.sesionId);
    check(error, "nueva versión");
    await refreshData();
    return input.sesionId;
  }

  const { data, error } = await supabase
    .from("sesiones")
    .insert({
      estudiante_id: uid,
      practica_id: input.practicaId ?? null,
      titulo: input.titulo,
      archivo_path: path,
      archivo_nombre: input.file.name,
    })
    .select("id")
    .single();
  check(error, "subir sesión");
  await refreshData();
  return data!.id as string;
}

/** Pide al backend el análisis de la IA (Gemini lee el PDF; si falla, cascada solo con el título). */
export async function analizarSesionIA(sesion: LearningSession, file?: File): Promise<AiReview> {
  await supabase.from("sesiones").update({ estado: "IA analizando" }).eq("id", sesion.id);

  try {
    let blob: Blob | undefined = file;
    if (!blob && sesion.archivoPath) {
      const dl = await supabase.storage.from(BUCKET).download(sesion.archivoPath);
      if (!dl.error) blob = dl.data;
    }
    const archivoBase64 = blob && blob.size <= 8 * 1024 * 1024 ? await fileToBase64(blob) : undefined;
    const mimeType = blob?.type || (sesion.archivo.toLowerCase().endsWith(".pdf") ? "application/pdf" : undefined);

    const { revision } = await apiFetch<{ revision: AiReview }>("/api/analizar-sesion", {
      body: { titulo: sesion.titulo, archivoBase64, mimeType },
    });

    const { error } = await supabase
      .from("sesiones")
      .update({ recomendaciones_ia: revision, estado: "Recomendaciones disponibles" })
      .eq("id", sesion.id);
    check(error, "guardar recomendaciones");
    await refreshData();
    return revision;
  } catch (e) {
    await supabase.from("sesiones").update({ estado: "Pendiente de revisión IA" }).eq("id", sesion.id);
    await refreshData();
    throw e;
  }
}

export async function enviarSesionADocente(id: string) {
  const { error } = await supabase.from("sesiones").update({ estado: "Enviada a docente" }).eq("id", id);
  check(error, "enviar a docente");
  await refreshData();
}

export async function revisarSesion(
  id: string,
  input: { aprobar: boolean; nota?: number; observaciones?: string },
) {
  if (input.aprobar && input.nota != null && (input.nota < 0 || input.nota > 20)) {
    throw new Error("La nota debe estar entre 0 y 20.");
  }
  const { error } = await supabase
    .from("sesiones")
    .update({
      estado: input.aprobar ? "Aprobada" : "Requiere modificaciones",
      nota: input.aprobar ? (input.nota ?? null) : null,
      observaciones_docente: input.observaciones?.trim() || null,
    })
    .eq("id", id);
  check(error, "revisar sesión");
  await refreshData();
}

/* ------------------------------- anecdotarios ---------------------------- */
export async function crearAnecdotario(input: { nombre: string; file?: File; practicaId?: string }) {
  const uid = await myId();
  let path: string | null = null;
  if (input.file) {
    validateFile(input.file);
    path = await subirArchivo(input.file, "anecdotarios");
  }
  const { error } = await supabase.from("anecdotarios").insert({
    estudiante_id: uid,
    practica_id: input.practicaId ?? null,
    nombre: input.nombre,
    archivo_path: path,
    estado: "Enviado",
  });
  check(error, "crear anecdotario");
  await refreshData();
}

/** La estudiante corrige su anecdotario: sube un archivo nuevo y vuelve a enviarlo. */
export async function reenviarAnecdotario(id: string, file: File) {
  validateFile(file);
  const path = await subirArchivo(file, "anecdotarios");
  const { error } = await supabase
    .from("anecdotarios")
    .update({ archivo_path: path, nombre: file.name, estado: "Enviado" })
    .eq("id", id);
  check(error, "reenviar anecdotario");
  await refreshData();
}

export async function revisarAnecdotario(id: string, estado: AnecdoteStatus, observaciones?: string) {
  const { error } = await supabase
    .from("anecdotarios")
    .update({ estado, observaciones: observaciones?.trim() || null })
    .eq("id", id);
  check(error, "revisar anecdotario");
  await refreshData();
}

/* -------------------------------- evidencias ----------------------------- */
export async function subirEvidencia(input: {
  file: File;
  tipo: "Fotografía" | "Documento" | "Registro de llegada";
  nombre?: string;
  practicaId?: string;
}) {
  validateFile(input.file);
  const uid = await myId();
  const path = await subirArchivo(input.file, "evidencias");
  const { error } = await supabase.from("evidencias").insert({
    estudiante_id: uid,
    practica_id: input.practicaId ?? null,
    tipo: input.tipo,
    nombre: input.nombre?.trim() || input.file.name,
    archivo_path: path,
  });
  check(error, "subir evidencia");
  await refreshData();
}

export async function validarEvidencia(id: string, estado: "Validada" | "Observada") {
  const { error } = await supabase.from("evidencias").update({ estado }).eq("id", id);
  check(error, "validar evidencia");
  await refreshData();
}

/* ------------------------------ notificaciones --------------------------- */
export async function marcarNotificacionLeida(id: string) {
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("id", id);
  check(error, "marcar notificación");
  await refreshData();
}

export async function marcarTodasLeidas() {
  const uid = await myId();
  const { error } = await supabase.from("notificaciones").update({ leida: true }).eq("user_id", uid).eq("leida", false);
  check(error, "marcar notificaciones");
  await refreshData();
}

/* --------------------------------- perfil -------------------------------- */
export async function actualizarMiPerfil(input: { nombres: string; apellidos: string; telefono?: string }) {
  const uid = await myId();
  if (!input.nombres.trim()) throw new Error("El nombre es obligatorio.");
  const { error } = await supabase
    .from("perfiles")
    .update({ nombres: input.nombres.trim(), apellidos: input.apellidos.trim(), telefono: input.telefono?.trim() || null })
    .eq("id", uid);
  check(error, "actualizar perfil");
  await refreshData();
}

export async function cambiarMiContrasena(nueva: string) {
  if (nueva.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres.");
  const { error } = await supabase.auth.updateUser({ password: nueva });
  check(error, "cambiar contraseña");
}

/* ---------------------------------- admin -------------------------------- */
export interface UsuarioInput {
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Role;
  programa?: string;
  ciclo?: string;
  docenteId?: string;
  institucionId?: string;
  password?: string;
}

/** Crea el usuario en Supabase Auth + su perfil (requiere el backend: usa la service_role). */
export async function crearUsuario(input: UsuarioInput): Promise<{ passwordTemporal: string }> {
  const res = await apiFetch<{ passwordTemporal: string }>("/api/admin/usuarios", { body: input });
  await refreshData();
  return { passwordTemporal: res.passwordTemporal };
}

export async function actualizarUsuario(
  id: string,
  patch: Partial<Omit<UsuarioInput, "correo" | "password">> & { estado?: "Activo" | "Inactivo" },
) {
  const { error } = await supabase
    .from("perfiles")
    .update({
      ...(patch.nombres !== undefined && { nombres: patch.nombres }),
      ...(patch.apellidos !== undefined && { apellidos: patch.apellidos }),
      ...(patch.rol !== undefined && { rol: patch.rol }),
      ...(patch.programa !== undefined && { programa: patch.programa || null }),
      ...(patch.ciclo !== undefined && { ciclo: patch.ciclo || null }),
      ...(patch.docenteId !== undefined && { docente_id: patch.docenteId || null }),
      ...(patch.institucionId !== undefined && { institucion_id: patch.institucionId || null }),
      ...(patch.estado !== undefined && { estado: patch.estado }),
    })
    .eq("id", id);
  check(error, "actualizar usuario");
  await refreshData();
}

export async function eliminarUsuario(id: string) {
  await apiFetch(`/api/admin/usuarios/${id}`, { method: "DELETE" });
  await refreshData();
}

export async function guardarInstitucion(input: {
  id?: string;
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  latitud?: number;
  longitud?: number;
  radio?: number;
  toleranciaPuntualMin?: number;
  toleranciaFaltaMin?: number;
  estado?: "Activa" | "Inactiva";
}) {
  const row = {
    nombre: input.nombre.trim(),
    direccion: input.direccion.trim(),
    distrito: input.distrito.trim(),
    provincia: input.provincia.trim(),
    departamento: input.departamento.trim(),
    latitud: input.latitud ?? null,
    longitud: input.longitud ?? null,
    radio_permitido_metros: input.radio ?? 100,
    tolerancia_puntual_min: input.toleranciaPuntualMin ?? 10,
    tolerancia_falta_min: input.toleranciaFaltaMin ?? 30,
    estado: input.estado ?? "Activa",
  };
  if (!row.nombre) throw new Error("El nombre de la institución es obligatorio.");
  const { error } = input.id
    ? await supabase.from("instituciones").update(row).eq("id", input.id)
    : await supabase.from("instituciones").insert(row);
  check(error, "guardar institución");
  await refreshData();
}

export async function eliminarInstitucion(id: string) {
  const { error } = await supabase.from("instituciones").delete().eq("id", id);
  check(error, "eliminar institución");
  await refreshData();
}

export async function guardarPractica(input: {
  id?: string;
  estudianteId: string;
  docenteId?: string;
  institucionId?: string;
  fecha: string;
  hora: string;
  sesion?: string;
  estado?: PracticeStatus;
}) {
  if (!input.estudianteId || !input.fecha) throw new Error("Estudiante y fecha son obligatorios.");
  const row = {
    estudiante_id: input.estudianteId,
    docente_id: input.docenteId || null,
    institucion_id: input.institucionId || null,
    fecha: input.fecha,
    hora: input.hora || "08:00",
    sesion: input.sesion?.trim() || null,
    estado: input.estado ?? "Pendiente",
  };
  const { error } = input.id
    ? await supabase.from("practicas").update(row).eq("id", input.id)
    : await supabase.from("practicas").insert(row);
  check(error, "guardar práctica");
  await refreshData();
}

export async function cambiarEstadoPractica(id: string, estado: PracticeStatus) {
  const { error } = await supabase.from("practicas").update({ estado }).eq("id", id);
  check(error, "cambiar estado de práctica");
  await refreshData();
}

export async function eliminarPractica(id: string) {
  const { error } = await supabase.from("practicas").delete().eq("id", id);
  check(error, "eliminar práctica");
  await refreshData();
}

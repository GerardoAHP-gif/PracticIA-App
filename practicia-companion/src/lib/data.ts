/**
 * Capa de datos de PracticIA (Supabase).
 *
 * Los datos se cargan una vez al entrar a la sección de cada rol (ver <RoleGate />)
 * y se guardan en arreglos en memoria. La seguridad NO depende del cliente: cada
 * consulta pasa por las políticas RLS de Supabase, así que cada rol solo recibe
 * las filas que le corresponden (estudiante: lo suyo; docente: sus estudiantes;
 * admin: todo).
 *
 * Después de cualquier cambio se llama a `refreshData()`.
 */
import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Role = "estudiante" | "docente" | "admin";

export type PracticeStatus =
  | "Pendiente"
  | "En preparación"
  | "Aprobada"
  | "En camino"
  | "Llegada registrada"
  | "Finalizada";

export type SessionStatus =
  | "Pendiente de revisión IA"
  | "IA analizando"
  | "Recomendaciones disponibles"
  | "Enviada a docente"
  | "Aprobada"
  | "Requiere modificaciones";

export type AttendanceStatus = "Confirmada" | "Observada";
export type Puntualidad = "Temprano" | "Puntual" | "Tarde";
/** Estado mostrado en reportes: los 3 anteriores más "Falta", que no se guarda — se calcula. */
export type EstadoAsistenciaReporte = Puntualidad | "Falta" | "Pendiente";
export type AnecdoteStatus = "Pendiente" | "Enviado" | "Revisado" | "Requiere modificación";
export type TrackingStatus = "Llegó" | "En camino" | "Pendiente" | "Incidencia";

export interface Person {
  id: string;
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Role;
  estado: "Activo" | "Inactivo";
  programa?: string | undefined;
  ciclo?: string | undefined;
  telefono?: string | undefined;
  docenteId?: string | undefined;
  institucionId?: string | undefined;
  avatar?: string | undefined;
}

export interface Institution {
  id: string;
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  latitud: number;
  longitud: number;
  radio: number; // metros permitidos para registrar asistencia
  toleranciaPuntualMin: number; // minutos después de la hora programada que aún cuentan como "Puntual"
  toleranciaFaltaMin: number; // minutos de gracia tras los que, sin registro, se considera "Falta"
  estado: "Activa" | "Inactiva";
}

export interface Practice {
  id: string;
  estudianteId: string;
  docenteId: string;
  institucionId: string;
  fecha: string; // YYYY-MM-DD
  hora: string; // HH:mm
  sesion: string;
  estado: PracticeStatus;
}

export interface AiReview {
  resumen: string;
  fortalezas: string[];
  recomendaciones: string[];
  porRevisar: string[];
  sugerencias: string[];
  proveedor?: string | undefined;
}

export interface LearningSession {
  id: string;
  estudianteId: string;
  practicaId: string;
  titulo: string;
  archivo: string;
  archivoPath?: string | undefined;
  version: number;
  estado: SessionStatus;
  actualizado: string;
  nota?: number | undefined;
  observacionesDocente?: string | undefined;
  revision?: AiReview | null | undefined;
}

export interface AttendanceRecord {
  id: string;
  estudianteId: string;
  practicaId: string;
  fecha: string;
  hora: string;
  institucionId: string;
  ubicacion: string;
  estado: AttendanceStatus;
  puntualidad?: Puntualidad | undefined;
  distanciaM?: number | undefined;
  evidencia: string;
  fotoPath?: string | undefined;
}

export interface Evidence {
  id: string;
  estudianteId: string;
  tipo: "Fotografía" | "Documento" | "Registro de llegada";
  nombre: string;
  fecha: string;
  practica: string;
  estado: "Validada" | "Pendiente" | "Observada";
  archivoPath?: string | undefined;
}

export interface Anecdote {
  id: string;
  estudianteId: string;
  nombre: string;
  fecha: string;
  estado: AnecdoteStatus;
  archivoPath?: string | undefined;
  observaciones?: string | undefined;
}

export interface AppNotification {
  id: string;
  para: Role;
  titulo: string;
  detalle: string;
  tiempo: string;
  tipo: "asistencia" | "sesion" | "recordatorio" | "revision" | "sistema";
  leida: boolean;
}

export interface TrackingItem {
  estudianteId: string;
  estado: TrackingStatus;
  detalle: string;
}

/* ------------------------------------------------------------------ */
/* Formato de fechas (sin depender de ICU del navegador)               */
/* ------------------------------------------------------------------ */
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const pad = (n: number) => String(n).padStart(2, "0");

export const todayISO = (d = new Date()) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function fmtDate(value?: string | Date | null): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value.length === 10 ? `${value}T00:00:00` : value) : value;
  if (Number.isNaN(d.getTime())) return "—";
  return `${pad(d.getDate())} ${MESES[d.getMonth()]} ${d.getFullYear()}`;
}
export const fmtTime = (value?: string | Date | null): string => {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
export const fmtDateTime = (value?: string | null) => (value ? `${fmtDate(value)}, ${fmtTime(value)}` : "—");

export function timeAgo(value?: string | null): string {
  if (!value) return "";
  const diff = Date.now() - new Date(value).getTime();
  const min = Math.round(diff / 60000);
  if (min < 1) return "Ahora";
  if (min < 60) return `Hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `Hace ${h} h`;
  const d = Math.round(h / 24);
  return d === 1 ? "Ayer" : `Hace ${d} días`;
}

/** Distancia en metros entre dos coordenadas (fórmula de Haversine). */
export function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/* ------------------------------------------------------------------ */
/* Almacén en memoria                                                  */
/* ------------------------------------------------------------------ */
export const institutions: Institution[] = [];
export const people: Person[] = [];
export const students: Person[] = [];
export const teachers: Person[] = [];
export const practices: Practice[] = [];
export const learningSessions: LearningSession[] = [];
export const attendance: AttendanceRecord[] = [];
export const evidences: Evidence[] = [];
export const anecdotes: Anecdote[] = [];
export const notifications: AppNotification[] = [];
export const tracking: TrackingItem[] = [];
export const monthlyStats: { mes: string; practicas: number; asistencias: number }[] = [];
export const sessionStateStats: { estado: string; total: number }[] = [];

const EMPTY_PERSON: Person = {
  id: "",
  nombres: "Usuario",
  apellidos: "",
  correo: "",
  rol: "estudiante",
  estado: "Activo",
};
export const currentUsers: Record<Role, Person> = {
  estudiante: { ...EMPTY_PERSON, rol: "estudiante" },
  docente: { ...EMPTY_PERSON, rol: "docente" },
  admin: { ...EMPTY_PERSON, rol: "admin" },
};

const replace = <T,>(target: T[], items: T[]) => {
  target.length = 0;
  target.push(...items);
};

/* ------------------------------------------------------------------ */
/* Suscripción (para re-renderizar cuando cambian los datos)           */
/* ------------------------------------------------------------------ */
let version = 0;
const listeners = new Set<() => void>();
const bump = () => {
  version += 1;
  listeners.forEach((l) => l());
};
export function useDataVersion(): number {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => version,
    () => 0,
  );
}

/* ------------------------------------------------------------------ */
/* Mapeo fila de base de datos → tipos de la interfaz                  */
/* ------------------------------------------------------------------ */
/* eslint-disable @typescript-eslint/no-explicit-any */
const toPerson = (r: any): Person => {
  const nombres = r.nombres ?? String(r.nombre_completo ?? "").split(" ")[0] ?? "";
  const apellidos = r.apellidos ?? String(r.nombre_completo ?? "").split(" ").slice(1).join(" ");
  return {
    id: r.id,
    nombres: nombres || "Usuario",
    apellidos: apellidos || "",
    correo: r.email ?? "",
    rol: (["docente", "admin"].includes(r.rol) ? r.rol : "estudiante") as Role,
    estado: r.estado === "Inactivo" ? "Inactivo" : "Activo",
    programa: r.programa ?? r.especialidad ?? undefined,
    ciclo: r.ciclo ?? undefined,
    telefono: r.telefono ?? undefined,
    docenteId: r.docente_id ?? undefined,
    institucionId: r.institucion_id ?? undefined,
  };
};

const toInstitution = (r: any): Institution => ({
  id: r.id,
  nombre: r.nombre,
  direccion: r.direccion ?? "",
  distrito: r.distrito ?? "",
  provincia: r.provincia ?? "",
  departamento: r.departamento ?? "",
  latitud: Number(r.latitud ?? 0),
  longitud: Number(r.longitud ?? 0),
  radio: Number(r.radio_permitido_metros ?? 100),
  toleranciaPuntualMin: Number(r.tolerancia_puntual_min ?? 10),
  toleranciaFaltaMin: Number(r.tolerancia_falta_min ?? 30),
  estado: r.estado === "Inactiva" ? "Inactiva" : "Activa",
});

const toPractice = (r: any): Practice => ({
  id: r.id,
  estudianteId: r.estudiante_id,
  docenteId: r.docente_id ?? "",
  institucionId: r.institucion_id ?? "",
  fecha: r.fecha,
  hora: String(r.hora ?? "08:00").slice(0, 5),
  sesion: r.sesion ?? "Práctica profesional",
  estado: r.estado,
});

const toSession = (r: any): LearningSession => ({
  id: r.id,
  estudianteId: r.estudiante_id,
  practicaId: r.practica_id ?? "",
  titulo: r.titulo,
  archivo: r.archivo_nombre ?? "",
  archivoPath: r.archivo_path ?? undefined,
  version: r.version ?? 1,
  estado: r.estado,
  actualizado: fmtDateTime(r.updated_at ?? r.created_at),
  nota: r.nota == null ? undefined : Number(r.nota),
  observacionesDocente: r.observaciones_docente ?? undefined,
  revision: r.recomendaciones_ia ?? null,
});

const toAttendance = (r: any, inst: Map<string, Institution>): AttendanceRecord => ({
  id: r.id,
  estudianteId: r.estudiante_id,
  practicaId: r.practica_id ?? "",
  fecha: fmtDate(r.fecha_hora),
  hora: fmtTime(r.fecha_hora),
  institucionId: r.institucion_id ?? "",
  ubicacion: r.ubicacion ?? inst.get(r.institucion_id)?.direccion ?? "—",
  estado: r.estado,
  puntualidad: r.puntualidad ?? undefined,
  distanciaM: r.distancia_m != null ? Math.round(Number(r.distancia_m)) : undefined,
  evidencia: r.foto_path ? String(r.foto_path).split("/").pop() ?? "" : "",
  fotoPath: r.foto_path ?? undefined,
});

const toEvidence = (r: any, prac: Map<string, Practice>): Evidence => ({
  id: r.id,
  estudianteId: r.estudiante_id,
  tipo: r.tipo,
  nombre: r.nombre,
  fecha: fmtDate(r.created_at),
  practica: prac.get(r.practica_id)?.sesion ?? "—",
  estado: r.estado,
  archivoPath: r.archivo_path ?? undefined,
});

const toAnecdote = (r: any): Anecdote => ({
  id: r.id,
  estudianteId: r.estudiante_id,
  nombre: r.nombre,
  fecha: fmtDate(r.created_at),
  estado: r.estado,
  archivoPath: r.archivo_path ?? undefined,
  observaciones: r.observaciones ?? undefined,
});

const toNotification = (r: any, role: Role): AppNotification => ({
  id: r.id,
  para: role,
  titulo: r.titulo,
  detalle: r.detalle ?? "",
  tiempo: timeAgo(r.created_at),
  tipo: r.tipo,
  leida: !!r.leida,
});

/* ------------------------------------------------------------------ */
/* Cálculos derivados                                                  */
/* ------------------------------------------------------------------ */
function computeTracking() {
  const today = todayISO();
  const out: TrackingItem[] = [];
  for (const s of students) {
    const mine = practices.filter((p) => p.estudianteId === s.id);
    const focus =
      mine.find((p) => p.fecha === today) ??
      mine.filter((p) => p.fecha > today).sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ??
      mine.sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
    const lastAtt = attendance.find((a) => a.estudianteId === s.id);
    if (s.estado === "Inactivo") {
      out.push({ estudianteId: s.id, estado: "Incidencia", detalle: "Estudiante inactivo" });
    } else if (!focus) {
      out.push({ estudianteId: s.id, estado: "Pendiente", detalle: "Sin práctica programada" });
    } else if (focus.estado === "Llegada registrada" || focus.estado === "Finalizada") {
      const att = lastAtt && lastAtt.practicaId === focus.id ? lastAtt : undefined;
      const obs = att?.estado === "Observada";
      out.push({
        estudianteId: s.id,
        estado: obs ? "Incidencia" : "Llegó",
        detalle: obs
          ? "Marcada por el docente para revisión"
          : att
            ? `${att.puntualidad ?? "Confirmada"} · ${att.hora}`
            : "Asistencia confirmada",
      });
    } else if (focus.estado === "En camino") {
      out.push({ estudianteId: s.id, estado: "En camino", detalle: "Salió hacia la institución" });
    } else {
      out.push({
        estudianteId: s.id,
        estado: "Pendiente",
        detalle: `Práctica programada ${focus.hora} · ${fmtDate(focus.fecha)}`,
      });
    }
  }
  replace(tracking, out);
}

function computeStats() {
  const now = new Date();
  const months: { key: string; mes: string; practicas: number; asistencias: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const mes = MESES[d.getMonth()] ?? "";
    months.push({ key: `${d.getFullYear()}-${pad(d.getMonth() + 1)}`, mes: mes.charAt(0).toUpperCase() + mes.slice(1), practicas: 0, asistencias: 0 });
  }
  for (const p of practices) {
    const m = months.find((x) => x.key === p.fecha.slice(0, 7));
    if (m) m.practicas += 1;
  }
  for (const a of rawAttendanceDates) {
    const m = months.find((x) => x.key === a.slice(0, 7));
    if (m) m.asistencias += 1;
  }
  replace(monthlyStats, months.map(({ mes, practicas, asistencias }) => ({ mes, practicas, asistencias })));

  const c = (fn: (s: LearningSession) => boolean) => learningSessions.filter(fn).length;
  replace(sessionStateStats, [
    { estado: "Aprobadas", total: c((s) => s.estado === "Aprobada") },
    { estado: "En revisión", total: c((s) => s.estado === "Enviada a docente") },
    { estado: "Con IA", total: c((s) => s.estado === "Recomendaciones disponibles" || s.estado === "IA analizando") },
    { estado: "Pendientes", total: c((s) => s.estado === "Pendiente de revisión IA" || s.estado === "Requiere modificaciones") },
  ]);
}
let rawAttendanceDates: string[] = [];

/* ------------------------------------------------------------------ */
/* Carga                                                               */
/* ------------------------------------------------------------------ */
export type LoadState = "idle" | "loading" | "ready" | "error" | "no-profile";
export const PERFIL_NO_ENCONTRADO = "PERFIL_NO_ENCONTRADO";

let currentAuthId: string | null = null;

const must = <T,>(res: { data: T | null; error: { message: string } | null }, what: string): T => {
  if (res.error) throw new Error(`${what}: ${res.error.message}`);
  return (res.data ?? []) as T;
};

export async function loadData(authUserId?: string): Promise<Person> {
  const uid = authUserId ?? currentAuthId;
  if (!uid) throw new Error("Sin sesión");
  currentAuthId = uid;

  const meRes = await supabase.from("perfiles").select("*").eq("id", uid).maybeSingle();
  if (meRes.error) throw new Error(`perfiles: ${meRes.error.message}`);
  if (!meRes.data) throw new Error(PERFIL_NO_ENCONTRADO);
  const me = toPerson(meRes.data);

  const [insRes, perRes, praRes, sesRes, asiRes, eviRes, aneRes, notRes] = await Promise.all([
    supabase.from("instituciones").select("*").order("nombre"),
    supabase.from("perfiles").select("*").order("nombre_completo"),
    supabase.from("practicas").select("*").order("fecha", { ascending: false }).limit(2000),
    supabase.from("sesiones").select("*").order("updated_at", { ascending: false }).limit(2000),
    supabase.from("asistencias").select("*").order("fecha_hora", { ascending: false }).limit(2000),
    supabase.from("evidencias").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("anecdotarios").select("*").order("created_at", { ascending: false }).limit(2000),
    supabase.from("notificaciones").select("*").order("created_at", { ascending: false }).limit(200),
  ]);

  const ins = must<any[]>(insRes as any, "instituciones").map(toInstitution);
  const per = must<any[]>(perRes as any, "perfiles").map(toPerson);
  const pra = must<any[]>(praRes as any, "practicas").map(toPractice);
  const insMap = new Map(ins.map((i) => [i.id, i]));
  const praMap = new Map(pra.map((p) => [p.id, p]));
  const asiRows = must<any[]>(asiRes as any, "asistencias");

  replace(institutions, ins);
  replace(people, per);
  replace(students, per.filter((p) => p.rol === "estudiante"));
  replace(teachers, per.filter((p) => p.rol === "docente"));
  replace(practices, pra);
  replace(learningSessions, must<any[]>(sesRes as any, "sesiones").map(toSession));
  replace(attendance, asiRows.map((r) => toAttendance(r, insMap)));
  rawAttendanceDates = asiRows.map((r) => String(r.fecha_hora));
  replace(evidences, must<any[]>(eviRes as any, "evidencias").map((r) => toEvidence(r, praMap)));
  replace(anecdotes, must<any[]>(aneRes as any, "anecdotarios").map(toAnecdote));
  replace(notifications, must<any[]>(notRes as any, "notificaciones").map((r) => toNotification(r, me.rol)));

  currentUsers[me.rol] = me;
  computeTracking();
  computeStats();
  bump();
  return me;
}

export const refreshData = () => loadData();

export function clearData() {
  for (const arr of [institutions, people, students, teachers, practices, learningSessions, attendance, evidences, anecdotes, notifications, tracking, monthlyStats, sessionStateStats] as unknown[][]) {
    arr.length = 0;
  }
  currentAuthId = null;
  (Object.keys(currentUsers) as Role[]).forEach((r) => (currentUsers[r] = { ...EMPTY_PERSON, rol: r }));
  bump();
}

/* ------------------------------------------------------------------ */
/* Helpers de lectura (mismos nombres que usaba la interfaz)           */
/* ------------------------------------------------------------------ */
export const fullName = (p?: Person) => (p ? `${p.nombres} ${p.apellidos}`.trim() : "—");
export const initials = (p?: Person) =>
  p ? `${(p.nombres[0] ?? "?")}${(p.apellidos[0] ?? "")}`.toUpperCase() : "?";
export const getPerson = (id?: string) => people.find((p) => p.id === id);
export const getInstitution = (id?: string) => institutions.find((i) => i.id === id);
export const practicesOf = (estudianteId: string) => practices.filter((p) => p.estudianteId === estudianteId);
export const studentsOf = (docenteId: string) => students.filter((s) => s.docenteId === docenteId);
export const trackingOf = (estudianteId: string) => tracking.find((t) => t.estudianteId === estudianteId);

/**
 * Clasifica una práctica para el reporte: si ya hay asistencia, usa la puntualidad real
 * calculada por el servidor. Si no la hay, la práctica es "Falta" recién después de pasar
 * la hora programada más el tiempo de gracia de la institución (así no marcamos falta
 * antes de que siquiera haya empezado la práctica).
 */
export function estadoAsistenciaPractica(p: Practice): EstadoAsistenciaReporte {
  const att = attendance.find((a) => a.practicaId === p.id);
  if (att) return att.puntualidad ?? "Puntual";
  const gracia = getInstitution(p.institucionId)?.toleranciaFaltaMin ?? 30;
  const limite = new Date(`${p.fecha}T${p.hora}:00`);
  limite.setMinutes(limite.getMinutes() + gracia);
  return new Date() > limite ? "Falta" : "Pendiente";
}

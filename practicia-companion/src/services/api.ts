/**
 * Cliente del backend de PracticIA (Render).
 * Todas las llamadas llevan el token de Supabase para que el backend sepa quién es el usuario
 * y para que nadie ajeno pueda gastar tus cuotas de IA.
 */
import { supabase } from "@/lib/supabase";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;

export const API_URL = (env["VITE_BACKEND_URL"] || "https://backend-agent-yipe.onrender.com").replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** Render (plan gratis) duerme el servicio: la primera llamada puede tardar ~50 s. */
const TIMEOUT_MS = 70_000;

export async function apiFetch<T = unknown>(
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined ? "POST" : "GET"),
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok || json["exito"] === false) {
      throw new ApiError(String(json["error"] || `Error del servidor (${res.status})`), res.status);
    }
    return json as T;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    if ((e as Error).name === "AbortError") {
      throw new ApiError("El servidor tardó demasiado en responder. Inténtalo de nuevo.", 408);
    }
    throw new ApiError("No se pudo conectar con el servidor. Revisa tu conexión.", 0);
  } finally {
    clearTimeout(timer);
  }
}

export interface HistorialItem {
  rol: "user" | "assistant";
  texto: string;
}

export const enviarMensajeIA = async (
  mensaje: string,
  promptSistema?: string,
  historial: HistorialItem[] = [],
): Promise<{ respuesta: string; proveedor?: string }> => {
  return apiFetch<{ respuesta: string; proveedor?: string }>("/api/chat", {
    body: { mensaje, promptSistema, historial },
  });
};

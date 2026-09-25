import { supabase } from "./supabase";
import { clearData, currentUsers, useDataVersion, type Person, type Role } from "./data";

export type { Role };

export const homeFor: Record<Role, string> = {
  estudiante: "/estudiante",
  docente: "/docente",
  admin: "/admin",
};

export const roleLabel: Record<Role, string> = {
  estudiante: "Estudiante",
  docente: "Docente",
  admin: "Administrador",
};

/**
 * Lee el rol del usuario autenticado desde la tabla `perfiles` (fuente de verdad).
 * Devuelve null si no hay sesión o si el usuario no tiene perfil / está inactivo.
 */
export async function fetchMyProfile(): Promise<
  { id: string; rol: Role; estado: string; email: string } | null
> {
  const { data: sess } = await supabase.auth.getSession();
  const user = sess.session?.user;
  if (!user) return null;
  const { data, error } = await supabase
    .from("perfiles")
    .select("id, rol, estado, email")
    .eq("id", user.id)
    .maybeSingle();
  if (error || !data) return null;
  const rol: Role = data.rol === "docente" || data.rol === "admin" ? data.rol : "estudiante";
  return { id: data.id, rol, estado: data.estado ?? "Activo", email: data.email ?? user.email ?? "" };
}

/** Cierra la sesión de Supabase de verdad y limpia todo rastro local. */
export const logoutSession = async (): Promise<void> => {
  clearData();
  try {
    await supabase.auth.signOut();
  } finally {
    if (typeof window !== "undefined") {
      // restos de versiones anteriores de la app
      window.localStorage.removeItem("practicia.session");
      // historiales del asistente IA guardados en este dispositivo
      Object.keys(window.localStorage)
        .filter((k) => k.startsWith("practicia_chat_history"))
        .forEach((k) => window.localStorage.removeItem(k));
    }
  }
};

/** Usuario real de la sección actual. Se actualiza solo cuando cambian los datos. */
export function useCurrentUser(role: Role): Person {
  useDataVersion();
  return currentUsers[role];
}

export function greeting(date = new Date()) {
  const h = date.getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

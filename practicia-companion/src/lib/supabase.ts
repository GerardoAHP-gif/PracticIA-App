import { createClient } from "@supabase/supabase-js";

const env = (import.meta as unknown as { env: Record<string, string | undefined> }).env;
const supabaseUrl = env["VITE_SUPABASE_URL"] || "";
const supabaseAnonKey = env["VITE_SUPABASE_ANON_KEY"] || env["VITE_SUPABASE_PUBLISHABLE_KEY"] || "";

if (!supabaseUrl || !supabaseAnonKey) {
  // Evita un fallo silencioso: se verá en la consola del navegador.
  console.error(
    "[PracticIA] Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Revisa tu .env o las variables de Netlify.",
  );
}

export const supabase = createClient(supabaseUrl || "http://localhost", supabaseAnonKey || "missing-key", {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export const BUCKET = "evidencias_practicia";

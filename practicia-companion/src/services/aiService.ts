/**
 * Servicio del asistente IA.
 * Ya NO llama a Gemini desde el navegador (así la clave no queda expuesta):
 * pasa por el backend, que prueba Gemini → Groq → OpenRouter en cascada.
 */
import { enviarMensajeIA, type HistorialItem } from "./api";
import { currentUsers, fmtDate, fullName, getInstitution, learningSessions, practicesOf, todayISO } from "@/lib/data";

// Se mantiene la interfaz que ya usaba la pantalla del asistente.
export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

/** Prompt de sistema con el contexto REAL de la estudiante que inició sesión. */
export function construirPromptSistema(): string {
  const user = currentUsers.estudiante;
  const misPracticas = user.id ? practicesOf(user.id) : [];
  const hoy = todayISO();
  const proxima =
    misPracticas.filter((p) => p.fecha >= hoy && p.estado !== "Finalizada").sort((a, b) => a.fecha.localeCompare(b.fecha))[0] ??
    misPracticas[0];
  const institucion = getInstitution(proxima?.institucionId);
  const ultimaSesion = learningSessions.find((s) => s.estudianteId === user.id);

  const lineas = [
    `- Estudiante de práctica: ${fullName(user)}${user.programa ? ` (${user.programa}${user.ciclo ? `, ciclo ${user.ciclo}` : ""})` : ""}.`,
    institucion ? `- Institución educativa: ${institucion.nombre}${institucion.direccion ? ` (${institucion.direccion})` : ""}.` : null,
    proxima ? `- Próxima práctica: ${fmtDate(proxima.fecha)} a las ${proxima.hora} · ${proxima.sesion}.` : null,
    ultimaSesion ? `- Sesión en trabajo: "${ultimaSesion.titulo}" (estado: ${ultimaSesion.estado}).` : null,
  ].filter(Boolean);

  return `Eres el Asistente IA pedagógico de la plataforma PracticIA.
Tu objetivo es acompañar, orientar y retroalimentar a estudiantes de formación docente durante su práctica profesional.

CONTEXTO ACTUAL DE LA ESTUDIANTE:
${lineas.join("\n")}

INSTRUCCIONES DE RESPUESTA:
1. Responde siempre en español, con tono pedagógico, cercano, constructivo y alentador.
2. Orienta sobre planificación curricular, estrategias didácticas, instrumentos de evaluación y momentos de la sesión (inicio, desarrollo, cierre).
3. Usa formato Markdown (negritas, listas) para que sea fácil de leer. Sé concreta: respuestas de hasta ~250 palabras salvo que pidan más.
4. Recuerda que tus sugerencias son orientativas y que la validación final corresponde a su docente formador.
5. Si no tienes información suficiente, pídela en lugar de inventarla.`;
}

/**
 * Envía el mensaje al backend. `historial` puede incluir el propio mensaje actual al final:
 * se descarta aquí porque el backend lo recibe aparte. Solo se mandan los últimos turnos
 * para no gastar tokens de más.
 */
export async function consultarAgenteIA(prompt: string, historial: ChatMessage[] = []): Promise<string> {
  let previos = historial;
  const ultimo = previos[previos.length - 1];
  if (ultimo && ultimo.role === "user" && ultimo.text === prompt) previos = previos.slice(0, -1);

  const historialBackend: HistorialItem[] = previos.slice(-8).map((m) => ({
    rol: m.role === "user" ? "user" : "assistant",
    texto: m.text,
  }));

  const { respuesta } = await enviarMensajeIA(prompt, construirPromptSistema(), historialBackend);
  return respuesta || "Sin respuesta del asistente.";
}

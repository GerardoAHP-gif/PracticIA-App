/**
 * Servicio de voz: entrada por micrófono (Web Speech API - SpeechRecognition) y
 * salida por voz (SpeechSynthesis). Ambas capacidades son NATIVAS del navegador
 * o dispositivo: el audio nunca se envía al modelo de IA ni a ningún servidor,
 * solo el texto ya transcrito. Por eso no hay costo de IA asociado a usar la voz.
 *
 * Disponibilidad real: depende del navegador. Chrome/Edge de escritorio y Android
 * la soportan bien; Safari/iOS tiene soporte parcial o nulo según versión. Por
 * eso todo aquí se expone como "intenta y avisa si no se puede", nunca se asume
 * que va a funcionar siempre.
 */

/* ---------------------------- Tipos mínimos ---------------------------- */
interface SpeechRecognitionAlternativeLike {
  transcript: string;
}
interface SpeechRecognitionResultLike {
  length: number;
  [index: number]: SpeechRecognitionAlternativeLike;
}
interface SpeechRecognitionResultListLike {
  length: number;
  [index: number]: SpeechRecognitionResultLike;
}
interface SpeechRecognitionEventLike extends Event {
  results: SpeechRecognitionResultListLike;
}
interface SpeechRecognitionErrorEventLike extends Event {
  error: string;
}
interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start(): void;
  stop(): void;
  onresult: ((ev: SpeechRecognitionEventLike) => void) | null;
  onerror: ((ev: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
}
interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike;
}
type VentanaConVoz = Window & {
  SpeechRecognition?: SpeechRecognitionConstructor;
  webkitSpeechRecognition?: SpeechRecognitionConstructor;
};

const obtenerConstructor = (): SpeechRecognitionConstructor | null => {
  if (typeof window === "undefined") return null;
  const w = window as VentanaConVoz;
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};

export const reconocimientoSoportado = (): boolean => obtenerConstructor() !== null;
export const vozSoportada = (): boolean => typeof window !== "undefined" && "speechSynthesis" in window;

export type MotivoErrorVoz = "no-soportado" | "permiso-denegado" | "sin-voz" | "red" | "otro";

const MENSAJES_ERROR: Record<MotivoErrorVoz, string> = {
  "no-soportado": "Tu navegador no soporta el reconocimiento de voz. Prueba con Chrome o desde el celular.",
  "permiso-denegado": "Necesitamos permiso para usar tu micrófono. Actívalo en los ajustes del navegador e inténtalo de nuevo.",
  "sin-voz": "No detectamos ninguna voz. Acércate al micrófono e inténtalo de nuevo.",
  red: "Sin conexión para procesar el audio. Revisa tu internet e inténtalo de nuevo.",
  otro: "No se pudo escuchar tu voz. Inténtalo de nuevo.",
};
export const mensajeErrorVoz = (motivo: MotivoErrorVoz): string => MENSAJES_ERROR[motivo];

const motivoDesde = (codigo: string): MotivoErrorVoz => {
  if (codigo === "not-allowed" || codigo === "service-not-allowed") return "permiso-denegado";
  if (codigo === "no-speech") return "sin-voz";
  if (codigo === "network") return "red";
  return "otro";
};

export interface ControlEscucha {
  detener: () => void;
}

/**
 * Escucha UNA frase por el micrófono (no queda grabando en segundo plano).
 * Devuelve un controlador para poder detener manualmente, o null si el
 * navegador no soporta reconocimiento de voz (ya se avisa por onError).
 */
export function escucharUnaVez(
  onResultado: (texto: string) => void,
  onError: (motivo: MotivoErrorVoz) => void,
  onFin?: () => void,
): ControlEscucha | null {
  const Ctor = obtenerConstructor();
  if (!Ctor) {
    onError("no-soportado");
    return null;
  }

  const recognition = new Ctor();
  recognition.lang = "es-PE";
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onresult = (ev) => {
    if (ev.results.length === 0 || ev.results[0]!.length === 0) return;
    const transcript = ev.results[0]![0]!.transcript;
    if (transcript) onResultado(transcript);
  };
  recognition.onerror = (ev) => onError(motivoDesde(ev.error));
  recognition.onend = () => onFin?.();

  try {
    recognition.start();
  } catch {
    onError("otro");
    return null;
  }
  return { detener: () => recognition.stop() };
}

let vocesEs: SpeechSynthesisVoice[] = [];
if (vozSoportada()) {
  const cargarVoces = () => {
    vocesEs = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("es"));
  };
  cargarVoces();
  window.speechSynthesis.onvoiceschanged = cargarVoces;
}

/** Lee un texto en voz alta. Devuelve false si el navegador no soporta síntesis de voz. */
export function hablar(texto: string, onFin?: () => void): boolean {
  if (!vozSoportada()) return false;
  window.speechSynthesis.cancel();

  // Quita marcado Markdown para que la lectura no diga "asterisco asterisco"
  const limpio = texto.replace(/[*_#`]/g, "").replace(/\n{2,}/g, ". ");
  const utterance = new SpeechSynthesisUtterance(limpio);
  utterance.lang = "es-PE";
  utterance.rate = 1.0;
  const voz = vocesEs.find((v) => v.lang.toLowerCase() === "es-pe") ?? vocesEs[0];
  if (voz) utterance.voice = voz;

  utterance.onend = () => onFin?.();
  utterance.onerror = () => onFin?.();
  window.speechSynthesis.speak(utterance);
  return true;
}

export function detenerVoz(): void {
  if (vozSoportada()) window.speechSynthesis.cancel();
}

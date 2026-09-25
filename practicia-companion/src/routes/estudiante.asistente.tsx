import { useState, useEffect, useRef } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Send, Sparkles, User, Mic, MicOff, Volume2, Square } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { consultarAgenteIA, type ChatMessage } from "../services/aiService";
import { detenerVoz, escucharUnaVez, hablar, mensajeErrorVoz, reconocimientoSoportado, type ControlEscucha } from "../services/voiceService";
import { useCurrentUser } from "@/lib/session";
import { toast } from "sonner";

export const Route = createFileRoute("/estudiante/asistente")({
  head: () => ({
    meta: [
      { title: "Asistente PracticIA — PracticIA" },
      {
        name: "description",
        content:
          "Conversa con el Asistente PracticIA para preparar y mejorar tu práctica profesional con recomendaciones orientativas.",
      },
      { property: "og:title", content: "Asistente PracticIA" },
      {
        property: "og:description",
        content: "Te ayudo a preparar y mejorar tu práctica profesional.",
      },
    ],
  }),
  component: AssistantPage,
});

interface Msg {
  from: "ia" | "yo";
  text: string;
}

const ejemplos = [
  "¿Cómo puedo mejorar mi sesión?",
  "¿Mi actividad está relacionada con el objetivo?",
  "Ayúdame a mejorar esta actividad.",
  "¿Qué podría considerar para mi evaluación?",
];

function AssistantPage() {
  const user = useCurrentUser("estudiante");
  const storageKey = `practicia_chat_history_${user.id || "anon"}`;
  const saludo = (): Msg[] => [
    {
      from: "ia",
      text: `Hola ${user.nombres}. Estoy aquí para acompañarte en la preparación de tu práctica. ¿Qué te gustaría revisar hoy?`,
    },
  ];

  const [messages, setMessages] = useState<Msg[]>(saludo);
  const [cargado, setCargado] = useState(false);
  const [input, setInput] = useState("");
  const [pensando, setPensando] = useState(false);

  // Historial en localStorage POR USUARIO (se lee en el navegador, nunca en el servidor)
  useEffect(() => {
    if (!user.id) return;
    try {
      const guardado = window.localStorage.getItem(storageKey);
      setMessages(guardado ? (JSON.parse(guardado) as Msg[]) : saludo());
    } catch {
      setMessages(saludo());
    }
    setCargado(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    if (!cargado || !user.id) return;
    try {
      // se guardan solo los últimos 60 mensajes para no llenar el almacenamiento
      window.localStorage.setItem(storageKey, JSON.stringify(messages.slice(-60)));
    } catch {
      /* almacenamiento lleno o bloqueado: se ignora */
    }
  }, [messages, cargado, storageKey, user.id]);

  // Estados de voz y reproducción
  const [escuchando, setEscuchando] = useState(false);
  const [reproduciendoIdx, setReproduciendoIdx] = useState<number | null>(null);
  const [fuePorVoz, setFuePorVoz] = useState(false);
  const controlRef = useRef<ControlEscucha | null>(null);

  // Función para reproducir el texto mediante síntesis de voz (o detenerla si ya está sonando)
  const hablarTexto = (texto: string, index: number) => {
    if (reproduciendoIdx === index) {
      detenerVoz();
      setReproduciendoIdx(null);
      return;
    }
    detenerVoz();
    const iniciado = hablar(texto, () => setReproduciendoIdx(null));
    if (!iniciado) {
      toast.error("Tu navegador no soporta la reproducción de voz.");
      return;
    }
    setReproduciendoIdx(index);
  };

  const toggleEscucha = () => {
    if (escuchando) {
      controlRef.current?.detener();
      setEscuchando(false);
      return;
    }
    if (!reconocimientoSoportado()) {
      toast.error(mensajeErrorVoz("no-soportado"));
      return;
    }
    detenerVoz();
    setReproduciendoIdx(null);

    controlRef.current = escucharUnaVez(
      (texto) => {
        setInput(texto);
        setFuePorVoz(true);
      },
      (motivo) => toast.error(mensajeErrorVoz(motivo)),
      () => setEscuchando(false),
    );
    if (controlRef.current) setEscuchando(true);
  };

  const enviar = async (texto: string) => {
    const t = texto.trim();
    if (!t || pensando) return;

    detenerVoz();
    setReproduciendoIdx(null);

    const usoMicrofono = fuePorVoz;
    setFuePorVoz(false);

    const nuevosMensajes: Msg[] = [...messages, { from: "yo", text: t }];
    setMessages(nuevosMensajes);
    setInput("");
    setPensando(true);

    try {
      const historialIA: ChatMessage[] = nuevosMensajes.map((m) => ({
        role: m.from === "yo" ? "user" : "model",
        text: m.text,
      }));

      const respuestaIA = await consultarAgenteIA(t, historialIA);

      setMessages((m) => {
        const actualizados = [...m, { from: "ia" as const, text: respuestaIA }];
        const nuevoIndice = actualizados.length - 1;

        if (usoMicrofono) {
          setTimeout(() => hablarTexto(respuestaIA, nuevoIndice), 200);
        }

        return actualizados;
      });
    } catch (error) {
      console.error("Error al conectar con la IA:", error);
      setMessages((m) => [
        ...m,
        {
          from: "ia",
          text: `Lo siento, no pude responder ahora. ${error instanceof Error ? error.message : ""} Inténtalo nuevamente.`.trim(),
        },
      ]);
    } finally {
      setPensando(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col pb-4">
      {/* Header */}
      <header className="surface-card mb-4 flex items-center gap-3 p-4">
        <span className="gradient-ia flex h-11 w-11 items-center justify-center rounded-xl text-primary-foreground">
          <Sparkles className="h-5 w-5" />
        </span>
        <div>
          <h1 className="font-bold">Asistente PracticIA</h1>
          <p className="text-xs text-muted-foreground">
            Te ayudo a preparar y mejorar tu práctica profesional.
          </p>
        </div>
      </header>

      {/* Historial de Mensajes */}
      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`flex gap-2 ${m.from === "yo" ? "justify-end" : "justify-start"}`}
          >
            {m.from === "ia" && (
              <span className="gradient-ia mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-primary-foreground">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
            )}

            <div className="relative max-w-[80%] group">
              <div
                className={`rounded-2xl px-4 py-2.5 text-sm ${
                  m.from === "yo"
                    ? "rounded-br-sm bg-primary text-primary-foreground"
                    : "surface-card rounded-bl-sm pr-10"
                }`}
              >
                {/* Renderizado con formato Markdown para la IA */}
                {m.from === "ia" ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert [&>p]:mb-2 [&>ul]:list-disc [&>ul]:pl-4 [&>ol]:list-decimal [&>ol]:pl-4">
                    <ReactMarkdown>{m.text}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{m.text}</p>
                )}
              </div>

              {/* Botón parlante para reproducir/detener */}
              {m.from === "ia" && (
                <button
                  type="button"
                  onClick={() => hablarTexto(m.text, i)}
                  className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                  title={reproduciendoIdx === i ? "Detener audio" : "Escuchar respuesta en voz"}
                >
                  {reproduciendoIdx === i ? (
                    <Square className="h-3.5 w-3.5 fill-current text-primary animate-pulse" />
                  ) : (
                    <Volume2 className="h-3.5 w-3.5" />
                  )}
                </button>
              )}
            </div>

            {m.from === "yo" && (
              <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                <User className="h-3.5 w-3.5" />
              </span>
            )}
          </div>
        ))}

        {pensando && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="gradient-ia flex h-7 w-7 items-center justify-center rounded-lg text-primary-foreground">
              <Sparkles className="h-3.5 w-3.5 animate-pulse" />
            </span>
            IA generando respuesta...
          </div>
        )}
      </div>

      {/* Sugerencias rápidas */}
      {messages.length <= 2 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {ejemplos.map((e) => (
            <button
              key={e}
              onClick={() => enviar(e)}
              disabled={pensando}
              className="surface-card px-3 py-2 text-left text-xs font-medium transition-colors hover:border-ia/40 disabled:opacity-50"
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {/* Formulario e input */}
      <div className="sticky bottom-0 bg-background pt-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviar(input);
          }}
          className="flex gap-2"
        >
          <Button
            type="button"
            variant="outline"
            onClick={toggleEscucha}
            className={`h-11 w-11 shrink-0 p-0 ${
              escuchando ? "border-red-500 bg-red-50 text-red-600 animate-pulse" : ""
            }`}
            title={escuchando ? "Detener micrófono" : "Hablar con el micrófono"}
            disabled={pensando}
          >
            {escuchando ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
          </Button>

          <Input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setFuePorVoz(false);
            }}
            placeholder={escuchando ? "Escuchando tu voz..." : "Escribe tu pregunta..."}
            className="h-11 bg-card"
            disabled={pensando}
          />

          <Button
            type="submit"
            className="h-11 w-11 shrink-0 p-0"
            aria-label="Enviar"
            disabled={pensando}
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-[11px] text-muted-foreground">
          Las recomendaciones de IA son orientativas. La evaluación final corresponde a tu docente.
        </p>
      </div>
    </div>
  );
}
import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { FileText, Loader2, NotebookPen, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { anecdotes, practicesOf, todayISO } from "@/lib/data";
import { abrirArchivo, crearAnecdotario, reenviarAnecdotario } from "@/lib/actions";

export const Route = createFileRoute("/estudiante/anecdotario")({
  head: () => ({
    meta: [
      { title: "Mi anecdotario — PracticIA" },
      {
        name: "description",
        content:
          "Sube tu anecdotario en PDF, revisa su estado y envíalo a tu docente para retroalimentación.",
      },
      { property: "og:title", content: "Mi anecdotario — PracticIA" },
      { property: "og:description", content: "Registro reflexivo de tus prácticas profesionales." },
    ],
  }),
  component: AnecdotePage,
});

function AnecdotePage() {
  const user = useCurrentUser("estudiante");
  const items = anecdotes.filter((a) => a.estudianteId === user.id);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const nuevoRef = useRef<HTMLInputElement>(null);
  const correccionRef = useRef<HTMLInputElement>(null);
  const [corrigiendoId, setCorrigiendoId] = useState<string | null>(null);

  const practicaActual =
    practicesOf(user.id).find((p) => p.fecha === todayISO()) ?? practicesOf(user.id).find((p) => p.estado !== "Finalizada");

  const esPdf = (f: File) => /pdf/i.test(f.type) || /\.pdf$/i.test(f.name);

  const subir = async (file: File) => {
    if (!esPdf(file)) {
      toast.error("El anecdotario debe ser un archivo PDF.");
      return;
    }
    setOcupado("nuevo");
    try {
      await crearAnecdotario({ nombre: file.name, file, ...(practicaActual ? { practicaId: practicaActual.id } : {}) });
      toast.success("Anecdotario enviado a tu docente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setOcupado(null);
    }
  };

  const corregir = async (file: File) => {
    if (!corrigiendoId) return;
    if (!esPdf(file)) {
      toast.error("El anecdotario debe ser un archivo PDF.");
      return;
    }
    setOcupado(corrigiendoId);
    try {
      await reenviarAnecdotario(corrigiendoId, file);
      toast.success("Anecdotario corregido y reenviado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo reenviar.");
    } finally {
      setOcupado(null);
      setCorrigiendoId(null);
    }
  };

  return (
    <div>
      <input
        ref={nuevoRef}
        type="file"
        hidden
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void subir(f);
        }}
      />
      <input
        ref={correccionRef}
        type="file"
        hidden
        accept="application/pdf,.pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void corregir(f);
        }}
      />
      <PageHeader
        title="Mi anecdotario"
        description="Registra y comparte tus reflexiones después de cada práctica."
        action={
          <Button className="h-10" disabled={ocupado !== null} onClick={() => nuevoRef.current?.click()}>
            {ocupado === "nuevo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Subir PDF
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Aún no has subido anecdotarios"
          description="Sube tu anecdotario en PDF y tu docente lo recibirá para retroalimentarte."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <article key={a.id} className="surface-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <FileText className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <button
                    type="button"
                    className="block max-w-full truncate text-left text-sm font-bold hover:underline"
                    disabled={!a.archivoPath}
                    onClick={() => abrirArchivo(a.archivoPath).catch((e) => toast.error(e.message))}
                  >
                    {a.nombre}
                  </button>
                  <p className="text-xs text-muted-foreground">{a.fecha}</p>
                </div>
                <StatusBadge status={a.estado} />
                {a.estado === "Requiere modificación" && (
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={ocupado !== null}
                    onClick={() => {
                      setCorrigiendoId(a.id);
                      correccionRef.current?.click();
                    }}
                  >
                    {ocupado === a.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}{" "}
                    Subir corrección
                  </Button>
                )}
              </div>
              {a.observaciones && (
                <p className="mt-3 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
                  <strong className="text-foreground">Observación de tu docente:</strong> {a.observaciones}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

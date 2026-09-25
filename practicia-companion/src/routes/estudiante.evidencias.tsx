import { useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, FileText, ImageIcon, Loader2, MapPin, Upload } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { SignedImage } from "@/components/practicia/signed-image";
import { useCurrentUser } from "@/lib/session";
import { evidences, practicesOf, todayISO } from "@/lib/data";
import { abrirArchivo, MAX_FILE_MB, subirEvidencia } from "@/lib/actions";

export const Route = createFileRoute("/estudiante/evidencias")({
  head: () => ({
    meta: [
      { title: "Mis evidencias — PracticIA" },
      {
        name: "description",
        content:
          "Galería de evidencias fotográficas y documentos asociados a tus prácticas profesionales.",
      },
      { property: "og:title", content: "Mis evidencias — PracticIA" },
      { property: "og:description", content: "Fotografías, documentos y registros de llegada." },
    ],
  }),
  component: EvidencePage,
});

const iconoTipo = {
  Fotografía: ImageIcon,
  Documento: FileText,
  "Registro de llegada": MapPin,
} as const;

function EvidencePage() {
  const user = useCurrentUser("estudiante");
  const items = evidences.filter((e) => e.estudianteId === user.id);
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const practicaActual =
    practicesOf(user.id).find((p) => p.fecha === todayISO()) ?? practicesOf(user.id).find((p) => p.estado !== "Finalizada");

  const subir = async (file: File) => {
    if (!/^image\//.test(file.type) && !/pdf/i.test(file.type)) {
      toast.error("Formatos permitidos: JPG, PNG y PDF.");
      return;
    }
    setSubiendo(true);
    try {
      await subirEvidencia({
        file,
        tipo: file.type.startsWith("image/") ? "Fotografía" : "Documento",
        ...(practicaActual ? { practicaId: practicaActual.id } : {}),
      });
      toast.success("Evidencia cargada correctamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir la evidencia.");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Evidencias"
        description="Fotografías, documentos y registros de llegada de tus prácticas."
        action={
          <>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept="image/*,application/pdf"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void subir(f);
              }}
            />
            <Button className="h-10" disabled={subiendo} onClick={() => inputRef.current?.click()}>
              {subiendo ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Subir evidencia
            </Button>
          </>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Aún no tienes evidencias"
          description="Sube fotografías o documentos de tu práctica. Las fotos de llegada aparecen aquí automáticamente."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((e) => {
            const Icon = iconoTipo[e.tipo];
            return (
              <article key={e.id} className="surface-card overflow-hidden">
                <button
                  type="button"
                  className="block w-full"
                  onClick={() => abrirArchivo(e.archivoPath).catch((err) => toast.error(err.message))}
                  disabled={!e.archivoPath}
                  aria-label={`Abrir ${e.nombre}`}
                >
                  {e.tipo === "Documento" ? (
                    <div className="flex h-32 items-center justify-center bg-muted text-muted-foreground">
                      <Icon className="h-8 w-8" />
                    </div>
                  ) : (
                    <SignedImage path={e.archivoPath} className="h-32 w-full" />
                  )}
                </button>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold">{e.nombre}</p>
                    <StatusBadge status={e.estado} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {e.tipo} · {e.practica}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{e.fecha}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <div className="surface-card mt-4 flex items-center gap-3 px-4 py-3">
        <Camera className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">
          Tamaño máximo por archivo: {MAX_FILE_MB} MB. Formatos permitidos: JPG, PNG y PDF.
        </p>
      </div>
    </div>
  );
}

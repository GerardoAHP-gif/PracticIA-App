import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, CheckCircle2, FileText, ImageIcon, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { SignedImage } from "@/components/practicia/signed-image";
import { useCurrentUser } from "@/lib/session";
import { evidences, fullName, getPerson, studentsOf } from "@/lib/data";
import { abrirArchivo, validarEvidencia } from "@/lib/actions";

export const Route = createFileRoute("/docente/evidencias")({
  head: () => ({
    meta: [
      { title: "Evidencias de prácticas — PracticIA" },
      {
        name: "description",
        content:
          "Revisa las evidencias fotográficas y documentales que tus estudiantes registran en cada práctica.",
      },
      { property: "og:title", content: "Evidencias de prácticas — PracticIA" },
      { property: "og:description", content: "Fotografías y documentos de cada práctica." },
    ],
  }),
  component: TeacherEvidence,
});

const iconoTipo = {
  Fotografía: ImageIcon,
  Documento: FileText,
  "Registro de llegada": MapPin,
} as const;

function TeacherEvidence() {
  const user = useCurrentUser("docente");
  const mias = studentsOf(user.id).map((s) => s.id);
  const items = evidences.filter((e) => mias.includes(e.estudianteId));
  const [ocupado, setOcupado] = useState<string | null>(null);

  const decidir = async (id: string, estado: "Validada" | "Observada") => {
    setOcupado(id);
    try {
      await validarEvidencia(id, estado);
      toast.success(estado === "Validada" ? "Evidencia validada." : "Evidencia observada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div>
      <PageHeader title="Evidencias" description="Material registrado por tus estudiantes." />
      {items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title="Sin evidencias"
          description="Las fotografías y documentos que suban tus estudiantes aparecerán aquí."
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
                  disabled={!e.archivoPath}
                  onClick={() => abrirArchivo(e.archivoPath).catch((err) => toast.error(err.message))}
                  aria-label={`Abrir ${e.nombre}`}
                >
                  {e.tipo === "Documento" ? (
                    <div className="flex h-28 items-center justify-center bg-muted text-muted-foreground">
                      <Icon className="h-7 w-7" />
                    </div>
                  ) : (
                    <SignedImage path={e.archivoPath} className="h-28 w-full" />
                  )}
                </button>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <p className="truncate text-sm font-bold">{e.nombre}</p>
                    <StatusBadge status={e.estado} />
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{fullName(getPerson(e.estudianteId))}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.tipo} · {e.practica} · {e.fecha}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" className="flex-1" disabled={ocupado === e.id || e.estado === "Validada"} onClick={() => decidir(e.id, "Validada")}>
                      <CheckCircle2 className="h-3.5 w-3.5" /> Validar
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" disabled={ocupado === e.id || e.estado === "Observada"} onClick={() => decidir(e.id, "Observada")}>
                      Observar
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

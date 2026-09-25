import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ClipboardCheck, Clock, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { attendance, getInstitution } from "@/lib/data";
import { abrirArchivo } from "@/lib/actions";

export const Route = createFileRoute("/estudiante/asistencia")({
  head: () => ({
    meta: [
      { title: "Mi asistencia — PracticIA" },
      {
        name: "description",
        content:
          "Historial de asistencias a tus prácticas profesionales con fecha, institución, hora, estado y evidencia.",
      },
      { property: "og:title", content: "Mi asistencia — PracticIA" },
      { property: "og:description", content: "Historial de llegadas y evidencias validadas." },
    ],
  }),
  component: AttendancePage,
});

function AttendancePage() {
  const user = useCurrentUser("estudiante");
  const registros = attendance.filter((a) => a.estudianteId === user.id);

  return (
    <div>
      <PageHeader
        title="Asistencia"
        description="Registro histórico de tus llegadas a la institución."
        action={
          <Button asChild className="h-10">
            <Link to="/estudiante/registrar-asistencia">
              <ClipboardCheck className="h-4 w-4" /> Registrar asistencia
            </Link>
          </Button>
        }
      />
      {registros.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Aún no registras asistencias"
          description="Cuando llegues a tu institución, registra tu llegada con ubicación y fotografía."
        />
      ) : (
        <div className="space-y-2">
          {registros.map((r) => {
            const inst = getInstitution(r.institucionId);
            return (
              <article key={r.id} className="surface-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold">{inst?.nombre ?? "Institución"}</p>
                    <p className="text-xs text-muted-foreground">{r.fecha}</p>
                  </div>
                  <StatusBadge status={r.estado} />
                </div>
                <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" /> {r.hora}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5" /> {r.ubicacion}
                  </span>
                  {r.fotoPath && (
                    <button
                      type="button"
                      className="flex items-center gap-1.5 text-primary hover:underline"
                      onClick={() => abrirArchivo(r.fotoPath).catch((e) => toast.error(e.message))}
                    >
                      <Camera className="h-3.5 w-3.5" /> Ver evidencia
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

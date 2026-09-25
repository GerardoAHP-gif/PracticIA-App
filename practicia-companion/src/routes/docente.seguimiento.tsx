import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import {
  fullName,
  getInstitution,
  initials,
  learningSessions,
  practicesOf,
  studentsOf,
  trackingOf,
} from "@/lib/data";

export const Route = createFileRoute("/docente/seguimiento")({
  head: () => ({
    meta: [
      { title: "Seguimiento de estudiantes — PracticIA" },
      {
        name: "description",
        content:
          "Seguimiento del día: estado de desplazamiento, llegada, sesión y asistencia de cada estudiante.",
      },
      { property: "og:title", content: "Seguimiento de estudiantes — PracticIA" },
      { property: "og:description", content: "Estado en vivo de la jornada de prácticas." },
    ],
  }),
  component: FollowUpPage,
});

function FollowUpPage() {
  const user = useCurrentUser("docente");
  const lista = studentsOf(user.id);

  return (
    <div>
      <PageHeader
        title="Seguimiento"
        description="Estado de la jornada de prácticas de tus estudiantes."
      />

      <div className="space-y-2">
        {lista.length === 0 && (
          <p className="surface-card p-6 text-center text-sm text-muted-foreground">
            Aún no tienes estudiantes asignados. El administrador puede asignarlos desde su panel.
          </p>
        )}
        {lista.map((s) => {
          const t = trackingOf(s.id);
          const proxima = practicesOf(s.id).find((p) => p.estado !== "Finalizada");
          const sesion = learningSessions.find((x) => x.estudianteId === s.id);
          return (
            <Link
              key={s.id}
              to="/docente/estudiantes/$estudianteId"
              params={{ estudianteId: s.id }}
              className="surface-card flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                {initials(s)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{fullName(s)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {getInstitution(s.institucionId)?.nombre} · {proxima?.hora ?? "—"}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">{t?.detalle}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <StatusBadge status={t?.estado ?? "Pendiente"} />
                  <StatusBadge status={sesion?.estado ?? "Pendiente de revisión IA"} />
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Search, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
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

export const Route = createFileRoute("/docente/estudiantes/")({
  head: () => ({
    meta: [
      { title: "Mis estudiantes — PracticIA" },
      {
        name: "description",
        content:
          "Lista de estudiantes asignadas con su institución, próxima práctica, estado de sesión y asistencia.",
      },
      { property: "og:title", content: "Mis estudiantes — PracticIA" },
      { property: "og:description", content: "Acompañamiento individual de cada estudiante." },
    ],
  }),
  component: StudentsList,
});

function StudentsList() {
  const user = useCurrentUser("docente");
  const [q, setQ] = useState("");
  const lista = studentsOf(user.id).filter((s) =>
    fullName(s).toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div>
      <PageHeader
        title="Mis estudiantes"
        description="Selecciona una estudiante para ver su seguimiento completo."
      />

      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar estudiante..."
          className="h-11 bg-card pl-9"
        />
      </div>

      {lista.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Sin resultados"
          description="No encontramos estudiantes con ese nombre. Prueba con otro término."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {lista.map((s) => {
            const proxima = practicesOf(s.id).find((p) => p.estado !== "Finalizada");
            const sesion = learningSessions.find((x) => x.estudianteId === s.id);
            const t = trackingOf(s.id);
            return (
              <Link
                key={s.id}
                to="/docente/estudiantes/$estudianteId"
                params={{ estudianteId: s.id }}
                className="surface-card p-4 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                    {initials(s)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold">{fullName(s)}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {getInstitution(s.institucionId)?.nombre}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-muted-foreground">Próxima práctica</p>
                    <p className="font-semibold">
                      {proxima ? `${proxima.fecha} · ${proxima.hora}` : "Sin programar"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-muted px-3 py-2">
                    <p className="text-muted-foreground">Asistencia</p>
                    <p className="font-semibold">{t?.estado ?? "Pendiente"}</p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <StatusBadge status={sesion?.estado ?? "Pendiente de revisión IA"} />
                  <StatusBadge status={t?.estado ?? "Pendiente"} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
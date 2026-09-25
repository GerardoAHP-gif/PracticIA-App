import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { RealMap } from "@/components/practicia/real-map";
import { Button } from "@/components/ui/button";
import { useCurrentUser } from "@/lib/session";
import { fullName, getInstitution, studentsOf, trackingOf } from "@/lib/data";

export const Route = createFileRoute("/docente/mapa")({
  head: () => ({
    meta: [
      { title: "Mapa de estudiantes — PracticIA" },
      {
        name: "description",
        content:
          "Visualiza el estado de llegada de tus estudiantes en el mapa: confirmadas, en desplazamiento, pendientes o con incidencia.",
      },
      { property: "og:title", content: "Mapa de estudiantes — PracticIA" },
      { property: "og:description", content: "Estado de llegada de la jornada en el mapa." },
    ],
  }),
  component: TeacherMap,
});

function TeacherMap() {
  const user = useCurrentUser("docente");
  const lista = studentsOf(user.id);
  const instituciones = Array.from(
    new Map(
      lista
        .map((s) => getInstitution(s.institucionId))
        .filter((i): i is NonNullable<typeof i> => !!i)
        .map((i) => [i.id, i]),
    ).values(),
  );
  const [selId, setSelId] = useState<string | null>(null);
  const seleccionada = instituciones.find((i) => i.id === selId) ?? instituciones[0];

  return (
    <div>
      <PageHeader
        title="Mapa"
        description="Ubicación de las instituciones donde practican tus estudiantes y su estado de llegada."
      />

      {instituciones.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {instituciones.map((i) => (
            <Button key={i.id} size="sm" variant={i.id === seleccionada?.id ? "default" : "outline"} onClick={() => setSelId(i.id)}>
              {i.nombre}
            </Button>
          ))}
        </div>
      )}

      <RealMap
        {...(seleccionada ? { lat: seleccionada.latitud, lng: seleccionada.longitud } : {})}
        className="h-[320px] md:h-[420px]"
      />
      {seleccionada && (
        <p className="mt-2 text-xs text-muted-foreground">
          {seleccionada.nombre} · {[seleccionada.direccion, seleccionada.distrito].filter(Boolean).join(", ")}
        </p>
      )}

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-success" /> Llegada confirmada
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-warning" /> En desplazamiento
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-muted-foreground" /> Pendiente
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Incidencia
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {lista.length === 0 && (
          <p className="surface-card p-6 text-center text-sm text-muted-foreground">Aún no tienes estudiantes asignados.</p>
        )}
        {lista.map((s) => {
          const t = trackingOf(s.id);
          return (
            <Link
              key={s.id}
              to="/docente/estudiantes/$estudianteId"
              params={{ estudianteId: s.id }}
              className="surface-card flex items-center gap-3 px-4 py-3 hover:border-primary/40"
            >
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${dot[t?.estado ?? "Pendiente"]}`} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{fullName(s)}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {getInstitution(s.institucionId)?.nombre ?? "Sin institución"} · {t?.detalle}
                </p>
              </div>
              <StatusBadge status={t?.estado ?? "Pendiente"} />
            </Link>
          );
        })}
      </div>
    </div>
  );
}

const dot = {
  Llegó: "bg-success",
  "En camino": "bg-warning",
  Pendiente: "bg-muted-foreground",
  Incidencia: "bg-destructive",
} as const;

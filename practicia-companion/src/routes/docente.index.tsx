import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpen, ClipboardCheck, NotebookPen, Users, MapPin } from "lucide-react";
import { PageHeader, SectionTitle, StatCard, StatusBadge } from "@/components/practicia/ui-bits";
import { greeting, useCurrentUser } from "@/lib/session";
import {
  anecdotes,
  fmtDate,
  fullName,
  getInstitution,
  getPerson,
  learningSessions,
  practices,
  studentsOf,
  todayISO,
  trackingOf,
} from "@/lib/data";

export const Route = createFileRoute("/docente/")({
  head: () => ({
    meta: [
      { title: "Inicio docente — PracticIA" },
      {
        name: "description",
        content:
          "Panel de la docente: estudiantes asignadas, prácticas de hoy, llegadas registradas y sesiones pendientes de revisión.",
      },
      { property: "og:title", content: "Inicio docente — PracticIA" },
      { property: "og:description", content: "Acompaña a tus estudiantes en tiempo real." },
    ],
  }),
  component: TeacherHome,
});

const trackingTone = {
  Llegó: "bg-success",
  "En camino": "bg-warning",
  Pendiente: "bg-muted-foreground",
  Incidencia: "bg-destructive",
} as const;

function TeacherHome() {
  const user = useCurrentUser("docente");
  const misEstudiantes = studentsOf(user.id);
  const hoy = practices.filter((p) => p.fecha === todayISO() && p.docenteId === user.id);
  const llegaron = misEstudiantes.filter((s) => trackingOf(s.id)?.estado === "Llegó").length;
  const sesionesPend = learningSessions.filter(
    (s) => misEstudiantes.some((e) => e.id === s.estudianteId) && s.estado === "Enviada a docente",
  ).length;

  const anecPend = anecdotes.filter(
    (a) => misEstudiantes.some((e) => e.id === a.estudianteId) && a.estado === "Enviado",
  ).length;

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user.nombres}`}
        description={`${user.programa ? `${user.programa} · ` : ""}${misEstudiantes.length} estudiantes asignados · ${fmtDate(new Date())}`}
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <StatCard label="Estudiantes asignadas" value={misEstudiantes.length} icon={Users} />
        <StatCard label="Prácticas de hoy" value={hoy.length} icon={ClipboardCheck} tone="info" />
        <StatCard label="Estudiantes que llegaron" value={llegaron} icon={MapPin} tone="success" />
        <StatCard label="Sesiones por revisar" value={sesionesPend} icon={BookOpen} tone="warning" />
        <StatCard label="Anecdotarios pendientes" value={anecPend} icon={NotebookPen} tone="ia" />
      </div>

      <section className="mt-7">
        <SectionTitle
          action={
            <Link to="/docente/seguimiento" className="text-xs font-semibold text-primary hover:underline">
              Ver seguimiento
            </Link>
          }
        >
          Prácticas de hoy
        </SectionTitle>

        <div className="surface-card overflow-hidden">
          <div className="hidden grid-cols-[1.4fr_1.4fr_.6fr_.9fr] gap-3 border-b border-border bg-muted/60 px-4 py-2.5 text-[11px] font-bold tracking-wide text-muted-foreground uppercase sm:grid">
            <span>Estudiante</span>
            <span>Institución</span>
            <span>Hora</span>
            <span>Estado</span>
          </div>
          {hoy.length === 0 && (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No hay prácticas programadas para hoy.</p>
          )}
          {hoy.map((p) => {
            const est = getPerson(p.estudianteId);
            const t = trackingOf(p.estudianteId);
            return (
              <Link
                key={p.id}
                to="/docente/estudiantes/$estudianteId"
                params={{ estudianteId: p.estudianteId }}
                className="grid gap-1 border-b border-border px-4 py-3 last:border-0 hover:bg-muted/50 sm:grid-cols-[1.4fr_1.4fr_.6fr_.9fr] sm:items-center sm:gap-3"
              >
                <span className="flex items-center gap-2 text-sm font-semibold">
                  <span
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${trackingTone[t?.estado ?? "Pendiente"]}`}
                  />
                  {fullName(est)}
                </span>
                <span className="truncate text-xs text-muted-foreground sm:text-sm">
                  {getInstitution(p.institucionId)?.nombre}
                </span>
                <span className="text-xs text-muted-foreground sm:text-sm">{p.hora}</span>
                <span>
                  <StatusBadge status={t?.estado ?? "Pendiente"} />
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="mt-7 grid gap-3 md:grid-cols-2">
        <Link to="/docente/sesiones" className="surface-card flex items-center gap-3 p-4 hover:border-primary/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <BookOpen className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Revisar sesiones de aprendizaje</p>
            <p className="text-xs text-muted-foreground">
              {sesionesPend} sesiones esperan tu evaluación
            </p>
          </div>
        </Link>
        <Link to="/docente/mapa" className="surface-card flex items-center gap-3 p-4 hover:border-primary/40">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </span>
          <div>
            <p className="text-sm font-bold">Ver mapa de estudiantes</p>
            <p className="text-xs text-muted-foreground">Estado de llegada de la jornada</p>
          </div>
        </Link>
      </section>
    </div>
  );
}

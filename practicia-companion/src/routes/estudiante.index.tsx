import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BookOpen,
  Bell,
  Camera,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Clock,
  MapPin,
  NotebookPen,
  Sparkles,
  CircleDashed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle, StatusBadge } from "@/components/practicia/ui-bits";
import { greeting, useCurrentUser } from "@/lib/session";
import {
  anecdotes,
  attendance,
  fmtDate,
  getInstitution,
  learningSessions,
  practicesOf,
  notifications,
  todayISO,
} from "@/lib/data";

export const Route = createFileRoute("/estudiante/")({
  head: () => ({
    meta: [
      { title: "Inicio del estudiante — PracticIA" },
      {
        name: "description",
        content:
          "Revisa tu próxima práctica, tu progreso de sesión, asistencia y anecdotario desde un solo lugar.",
      },
      { property: "og:title", content: "Inicio del estudiante — PracticIA" },
      {
        property: "og:description",
        content: "Tu próxima práctica, progreso y acciones rápidas.",
      },
    ],
  }),
  component: StudentHome,
});

function StudentHome() {
  const user = useCurrentUser("estudiante");
  const hoy = todayISO();
  const pendientes = practicesOf(user.id)
    .filter((p) => p.estado !== "Finalizada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proxima = pendientes.find((p) => p.fecha >= hoy) ?? pendientes[0];
  const institucion = getInstitution(proxima?.institucionId);
  const misSesiones = learningSessions.filter((s) => s.estudianteId === user.id);
  const sesion = misSesiones.find((s) => s.practicaId === proxima?.id) ?? misSesiones[0];
  const misAnecdotarios = anecdotes.filter((a) => a.estudianteId === user.id);
  const asistio = attendance.some((a) => a.estudianteId === user.id && (!proxima || a.practicaId === proxima.id));
  const recordatorios = notifications.filter((n) => n.para === "estudiante" && !n.leida).slice(0, 4);

  const progreso = [
    {
      label: "Sesión de aprendizaje",
      estado: sesion && sesion.estado !== "Pendiente de revisión IA" ? (sesion.estado === "Aprobada" ? "Completada" : sesion.estado) : "Pendiente",
      to: "/estudiante/sesiones",
    },
    {
      label: "Evaluación docente",
      estado: sesion?.estado === "Aprobada" ? "Completada" : sesion?.estado === "Requiere modificaciones" ? "Requiere modificaciones" : "Pendiente",
      to: "/estudiante/sesiones",
    },
    { label: "Asistencia", estado: asistio ? "Completada" : "Pendiente", to: "/estudiante/asistencia" },
    {
      label: "Anecdotario",
      estado: misAnecdotarios.length > 0 ? (misAnecdotarios.some((x) => x.estado === "Revisado") ? "Completada" : "Enviado") : "Pendiente",
      to: "/estudiante/anecdotario",
    },
  ];

  const acciones = [
    { label: "Asistente IA", to: "/estudiante/asistente", icon: Sparkles },
    { label: "Subir evidencia", to: "/estudiante/evidencias", icon: Camera },
    { label: "Anecdotario", to: "/estudiante/anecdotario", icon: NotebookPen },
    { label: "Notificaciones", to: "/estudiante/notificaciones", icon: Bell },
  ];

  return (
    <div>
      <PageHeader
        title={`${greeting()}, ${user.nombres}`}
        description={[user.programa, user.ciclo ? `Ciclo ${user.ciclo}` : ""].filter(Boolean).join(" · ") || "Estudiante de práctica"}
      />

      {/* Próxima práctica */}
      {proxima ? (
      <section className="gradient-brand relative overflow-hidden rounded-2xl p-5 text-primary-foreground shadow-float">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-primary-foreground/70 uppercase">
              Próxima práctica
            </p>
            <h2 className="mt-1 text-lg font-extrabold">{institucion?.nombre ?? "Institución por confirmar"}</h2>
          </div>
          <StatusBadge
            status={proxima.estado}
            className="border-primary-foreground/25 bg-primary-foreground/15 text-primary-foreground"
          />
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 opacity-80" />
            <span>
              {fmtDate(proxima.fecha)} · {proxima.hora}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 opacity-80" />
            <span className="truncate">{institucion?.distrito || "—"}</span>
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 opacity-80" />
            <span className="truncate">{proxima.sesion}</span>
          </div>
        </dl>
        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Button asChild variant="secondary" className="h-11 font-semibold">
            <Link to="/estudiante/sesiones">Preparar sesión</Link>
          </Button>
          <Button asChild variant="secondary" className="h-11 font-semibold">
            <Link to="/estudiante/mi-practica">Ir a mi práctica</Link>
          </Button>
          <Button asChild variant="secondary" className="h-11 font-semibold">
            <Link to="/estudiante/registrar-asistencia">Registrar asistencia</Link>
          </Button>
        </div>
      </section>
      ) : (
        <section className="surface-card p-5 text-center">
          <p className="font-bold">No tienes una práctica programada</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Cuando el administrador programe tu práctica, verás aquí la institución, la fecha y la hora.
          </p>
        </section>
      )}

      {/* Progreso */}
      <section className="mt-7">
        <SectionTitle>Tu progreso</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {progreso.map((p) => (
            <Link
              key={p.label}
              to={p.to}
              className="surface-card flex items-center gap-3 px-4 py-3 transition-colors hover:border-primary/40"
            >
              {p.estado.startsWith("Complet") ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <CircleDashed className="h-5 w-5 shrink-0 text-muted-foreground" />
              )}
              <span className="flex-1 text-sm font-semibold">{p.label}</span>
              <StatusBadge status={p.estado} />
            </Link>
          ))}
        </div>
      </section>

      {/* Recordatorios */}
      <section className="mt-7">
        <SectionTitle
          action={
            <Link
              to="/estudiante/notificaciones"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Ver todo
            </Link>
          }
        >
          Recordatorios
        </SectionTitle>
        <div className="space-y-2">
          {recordatorios.length === 0 && (
            <p className="px-1 text-sm text-muted-foreground">No tienes recordatorios pendientes.</p>
          )}
          {recordatorios.map((r) => (
            <div key={r.id} className="surface-card flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <Bell className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold">{r.titulo}</p>
                <p className="text-xs text-muted-foreground">{r.detalle}</p>
              </div>
              <span className="ml-auto text-[11px] whitespace-nowrap text-muted-foreground">
                {r.tiempo}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Acciones rápidas */}
      <section className="mt-7">
        <SectionTitle>Acciones rápidas</SectionTitle>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {acciones.map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="surface-card flex flex-col items-start gap-3 p-4 transition-colors hover:border-primary/40"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <a.icon className="h-4 w-4" />
              </span>
              <span className="text-sm font-semibold">{a.label}</span>
            </Link>
          ))}
        </div>
      </section>

      <Link
        to="/estudiante/calendario"
        className="surface-card mt-7 flex items-center gap-3 px-4 py-3 transition-colors hover:border-primary/40"
      >
        <ClipboardCheck className="h-5 w-5 text-primary" />
        <span className="text-sm font-semibold">Ver calendario de prácticas</span>
        <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
      </Link>
    </div>
  );
}
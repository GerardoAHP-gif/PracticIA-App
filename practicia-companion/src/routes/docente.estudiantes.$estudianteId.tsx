import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Camera,
  Clock,
  FileText,
  MapPin,
  NotebookPen,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader, SectionTitle, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import {
  anecdotes,
  fmtDate,
  attendance,
  fullName,
  getInstitution,
  getPerson,
  initials,
  learningSessions,
  practicesOf,
  trackingOf,
} from "@/lib/data";

export const Route = createFileRoute("/docente/estudiantes/$estudianteId")({
  head: () => ({
    meta: [
      { title: "Detalle de estudiante — PracticIA" },
      {
        name: "description",
        content:
          "Información, práctica, sesión de aprendizaje, asistencia y anecdotario de la estudiante en seguimiento.",
      },
      { property: "og:title", content: "Detalle de estudiante — PracticIA" },
      { property: "og:description", content: "Seguimiento integral de la práctica profesional." },
    ],
  }),
  component: StudentDetail,
});

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 text-sm last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

function StudentDetail() {
  useCurrentUser("docente");
  const { estudianteId } = useParams({ from: "/docente/estudiantes/$estudianteId" });
  const est = getPerson(estudianteId);
  const practica = est ? practicesOf(est.id).find((p) => p.estado !== "Finalizada") : undefined;
  const sesion = learningSessions.find((s) => s.estudianteId === estudianteId);
  const asistencia = attendance.find((a) => a.estudianteId === estudianteId);
  const anecdotario = anecdotes.find((a) => a.estudianteId === estudianteId);
  const t = trackingOf(estudianteId);
  const institucion = getInstitution(est?.institucionId);

  if (!est) {
    return <p className="text-sm text-muted-foreground">Estudiante no encontrada.</p>;
  }

  return (
    <div>
      <Link
        to="/docente/estudiantes"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Mis estudiantes
      </Link>

      <div className="surface-card mb-5 flex items-center gap-4 p-5">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-lg font-extrabold text-primary">
          {initials(est)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold">{fullName(est)}</p>
          <p className="truncate text-sm text-muted-foreground">
            {[est.programa, est.ciclo ? `Ciclo ${est.ciclo}` : ""].filter(Boolean).join(" · ") || "Estudiante"}
          </p>
        </div>
        <StatusBadge status={t?.estado ?? "Pendiente"} />
      </div>

      <Tabs defaultValue="info">
        <TabsList className="mb-4 flex-wrap">
          <TabsTrigger value="info">Información</TabsTrigger>
          <TabsTrigger value="practica">Práctica</TabsTrigger>
          <TabsTrigger value="sesion">Sesión</TabsTrigger>
          <TabsTrigger value="asistencia">Asistencia</TabsTrigger>
          <TabsTrigger value="anecdotario">Anecdotario</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="surface-card p-5">
            <SectionTitle>Información</SectionTitle>
            <Field label="Nombre" value={fullName(est)} />
            <Field label="Programa" value={est.programa ?? "—"} />
            <Field label="Institución" value={institucion?.nombre ?? "—"} />
            <Field label="Docente" value={fullName(getPerson(est.docenteId))} />
            <Field label="Estado" value={est.estado} />
            <Field label="Correo" value={est.correo} />
          </div>
        </TabsContent>

        <TabsContent value="practica">
          <div className="surface-card p-5">
            <SectionTitle>Práctica</SectionTitle>
            <Field label="Fecha" value={practica ? fmtDate(practica.fecha) : "—"} />
            <Field label="Hora" value={practica?.hora ?? "—"} />
            <Field label="Institución" value={institucion?.nombre ?? "—"} />
            <Field label="Sesión" value={practica?.sesion ?? "—"} />
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
              <Clock className="h-3.5 w-3.5" /> {t?.detalle ?? "Sin actividad reciente"}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="sesion">
          <div className="surface-card p-5">
            <SectionTitle
              action={
                sesion ? (
                  <Button asChild size="sm">
                    <Link to="/docente/sesiones/$sesionId" params={{ sesionId: sesion.id }}>
                      Evaluar sesión
                    </Link>
                  </Button>
                ) : undefined
              }
            >
              Sesión de aprendizaje
            </SectionTitle>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{sesion?.archivo ?? "Sin documento"}</p>
                <p className="text-xs text-muted-foreground">Versión {sesion?.version ?? 0}</p>
              </div>
              <StatusBadge status={sesion?.estado ?? "Pendiente de revisión IA"} />
            </div>

            <div className="mt-4 rounded-xl border border-ia/25 bg-ia/8 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-ia">
                <Sparkles className="h-4 w-4" /> Recomendaciones IA (orientativas)
              </p>
              {sesion?.revision ? (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {sesion.revision.recomendaciones.map((r, i) => (
                    <li key={i} className="text-muted-foreground">
                      · {r}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">Sin recomendaciones de IA todavía.</p>
              )}
            </div>

            <div className="mt-4">
              <p className="text-sm font-bold">Observaciones docentes</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {sesion?.observacionesDocente ?? "Aún no has registrado observaciones."}
              </p>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="asistencia">
          <div className="surface-card p-5">
            <SectionTitle>Asistencia</SectionTitle>
            {asistencia ? (
              <>
                <Field label="Fecha" value={asistencia.fecha} />
                <Field label="Hora" value={asistencia.hora} />
                <Field label="Ubicación" value={asistencia.ubicacion} />
                <Field label="Estado" value={asistencia.estado} />
                <div className="mt-3 flex items-center gap-3 rounded-xl bg-muted p-3">
                  <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-card text-muted-foreground">
                    <Camera className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold">{asistencia.evidencia || "Sin foto"}</p>
                    <p className="text-xs text-muted-foreground">Evidencia fotográfica de llegada</p>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Sin registros de asistencia.</p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="anecdotario">
          <div className="surface-card p-5">
            <SectionTitle>Anecdotario</SectionTitle>
            {anecdotario ? (
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <NotebookPen className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{anecdotario.nombre}</p>
                  <p className="text-xs text-muted-foreground">{anecdotario.fecha}</p>
                </div>
                <StatusBadge status={anecdotario.estado} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Sin anecdotarios cargados.</p>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <div className="surface-card mt-4 flex flex-wrap items-center gap-3 p-4 text-xs text-muted-foreground">
        <User className="h-4 w-4 text-primary" />
        La evaluación final de la sesión y del anecdotario corresponde siempre a la docente.
        <MapPin className="ml-auto hidden h-4 w-4 sm:block" />
      </div>
    </div>
  );
}
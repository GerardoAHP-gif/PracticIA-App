import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Users,
  Building2,
  FileCheck2,
  Clock,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/practicia/ui-bits";
import { attendance, institutions, learningSessions, sessionStateStats, students, useDataVersion } from "@/lib/data";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Panel General — PracticIA Admin" }],
  }),
  component: AdminDashboardPage,
});

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

function AdminDashboardPage() {
  useCurrentUser("admin");
  useDataVersion();

  const activos = students.filter((s) => s.estado === "Activo");
  const asignados = activos.filter((s) => s.docenteId && s.institucionId).length;
  const aprobadas = learningSessions.filter((s) => s.estado === "Aprobada").length;
  const confirmadas = attendance.filter((a) => a.estado === "Confirmada").length;
  const conIA = learningSessions.filter((s) => s.revision).length;

  const porInstitucion = institutions.map((ie) => {
    const est = students.filter((s) => s.institucionId === ie.id);
    const ids = new Set(est.map((e) => e.id));
    const ses = learningSessions.filter((s) => ids.has(s.estudianteId));
    const avance = pct(ses.filter((s) => s.estado === "Aprobada").length, ses.length);
    return { id: ie.id, nombre: ie.nombre, alumnos: est.length, sesiones: ses.length, avance };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Panel general de administración"
        description="Supervisión global de practicantes, instituciones educativas, asistencias y uso de IA pedagógica."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Practicantes activos"
          valor={String(activos.length)}
          nota={activos.length ? `${pct(asignados, activos.length)}% con docente e institución` : "Aún sin estudiantes"}
          icon={Users}
          tone="bg-primary/10 text-primary"
        />
        <Kpi
          label="Instituciones (I.E.)"
          valor={String(institutions.length)}
          nota={`${institutions.filter((i) => i.estado === "Activa").length} activas`}
          icon={Building2}
          tone="bg-emerald-500/10 text-emerald-600"
        />
        <Kpi
          label="Sesiones aprobadas"
          valor={learningSessions.length ? `${pct(aprobadas, learningSessions.length)}%` : "—"}
          nota={`${aprobadas} de ${learningSessions.length} sesiones`}
          icon={FileCheck2}
          tone="bg-blue-500/10 text-blue-600"
        />
        <Kpi
          label="Asistencias confirmadas"
          valor={attendance.length ? `${pct(confirmadas, attendance.length)}%` : "—"}
          nota={`${confirmadas} de ${attendance.length} registros`}
          icon={Clock}
          tone="bg-purple-500/10 text-purple-600"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="surface-card space-y-4 p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <SectionTitle>Avance por institución educativa</SectionTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1 text-xs">
              <Link to="/admin/instituciones">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </div>
          {porInstitucion.length === 0 ? (
            <p className="text-sm text-muted-foreground">Registra instituciones para ver su avance aquí.</p>
          ) : (
            <div className="space-y-3">
              {porInstitucion.map((ie) => (
                <div key={ie.id} className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>
                      {ie.nombre} ({ie.alumnos} estudiantes)
                    </span>
                    <span className="text-xs font-bold">
                      {ie.sesiones === 0 ? "Sin sesiones" : `${ie.avance}% de sesiones aprobadas`}
                    </span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${ie.avance > 80 ? "bg-emerald-500" : "bg-amber-500"}`}
                      style={{ width: `${ie.avance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="surface-card space-y-4 p-5">
          <div className="flex items-center gap-2 font-bold">
            <Sparkles className="h-5 w-5 text-ia" />
            <h3>Sesiones y revisión con IA</h3>
          </div>
          <div className="rounded-xl bg-ia/10 p-3">
            <p className="text-xs text-muted-foreground">Sesiones con recomendaciones de IA</p>
            <p className="text-xl font-bold text-ia">{conIA}</p>
          </div>
          <ul className="space-y-1 text-xs text-muted-foreground">
            {sessionStateStats.map((s) => (
              <li key={s.estado} className="flex justify-between">
                <span>· {s.estado}</span>
                <strong>{s.total}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

function Kpi({
  label,
  valor,
  nota,
  icon: Icon,
  tone,
}: {
  label: string;
  valor: string;
  nota: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
}) {
  return (
    <div className="surface-card flex items-center justify-between p-4">
      <div>
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold">{valor}</p>
        <p className="mt-1 text-[11px] text-muted-foreground">{nota}</p>
      </div>
      <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${tone}`}>
        <Icon className="h-6 w-6" />
      </span>
    </div>
  );
}

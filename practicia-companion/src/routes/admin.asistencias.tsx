import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, StatCard, StatusBadge } from "@/components/practicia/ui-bits";
import { AlarmClockCheck, AlertTriangle, CalendarX2, CheckCircle2, Sunrise } from "lucide-react";
import { attendance, fullName, getInstitution, getPerson } from "@/lib/data";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/admin/asistencias")({
  head: () => ({
    meta: [
      { title: "Asistencias institucionales — PracticIA" },
      {
        name: "description",
        content:
          "Consolidado de asistencias registradas por las estudiantes en todas las instituciones del programa.",
      },
      { property: "og:title", content: "Asistencias institucionales — PracticIA" },
      { property: "og:description", content: "Control global de llegadas e incidencias." },
    ],
  }),
  component: AdminAttendance,
});

function AdminAttendance() {
  useCurrentUser("admin");
  const temprano = attendance.filter((a) => a.puntualidad === "Temprano").length;
  const puntual = attendance.filter((a) => a.puntualidad === "Puntual").length;
  const tarde = attendance.filter((a) => a.puntualidad === "Tarde").length;
  const observadas = attendance.filter((a) => a.estado === "Observada").length;

  return (
    <div>
      <PageHeader
        title="Asistencias"
        description="Consolidado de registros de llegada, validados con GPS en el servidor, en todas las instituciones."
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Temprano" value={temprano} icon={Sunrise} tone="success" />
        <StatCard label="Puntual" value={puntual} icon={CheckCircle2} tone="success" />
        <StatCard label="Tarde" value={tarde} icon={AlarmClockCheck} tone="warning" />
        <StatCard label="Observadas" value={observadas} icon={AlertTriangle} tone="danger" />
      </div>
      <p className="mb-4 flex items-center gap-2 text-xs text-muted-foreground">
        <CalendarX2 className="h-3.5 w-3.5" /> Las faltas (prácticas sin ningún registro pasada la hora) se muestran en
        Reportes, calculadas junto con las prácticas programadas.
      </p>

      <div className="surface-card overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="bg-muted/60 text-[11px] tracking-wide text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-2.5 text-left font-bold">Estudiante</th>
              <th className="px-4 py-2.5 text-left font-bold">Institución</th>
              <th className="px-4 py-2.5 text-left font-bold">Fecha</th>
              <th className="px-4 py-2.5 text-left font-bold">Hora</th>
              <th className="px-4 py-2.5 text-left font-bold">Ubicación</th>
              <th className="px-4 py-2.5 text-left font-bold">Puntualidad</th>
              <th className="px-4 py-2.5 text-left font-bold">Estado</th>
            </tr>
          </thead>
          <tbody>
            {attendance.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  Aún no hay asistencias registradas.
                </td>
              </tr>
            )}
            {attendance.map((a) => (
              <tr key={a.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold">{fullName(getPerson(a.estudianteId))}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {getInstitution(a.institucionId)?.nombre ?? "—"}
                </td>
                <td className="px-4 py-3 text-muted-foreground">{a.fecha}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.hora}</td>
                <td className="px-4 py-3 text-muted-foreground">{a.ubicacion}</td>
                <td className="px-4 py-3">{a.puntualidad ? <StatusBadge status={a.puntualidad} /> : "—"}</td>
                <td className="px-4 py-3">
                  <StatusBadge status={a.estado} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

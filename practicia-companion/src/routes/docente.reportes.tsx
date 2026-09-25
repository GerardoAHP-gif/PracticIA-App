import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/components/practicia/reports-view";
import { useCurrentUser } from "@/lib/session";
import { studentsOf } from "@/lib/data";

export const Route = createFileRoute("/docente/reportes")({
  head: () => ({
    meta: [{ title: "Reportes y analítica — PracticIA Docente" }],
  }),
  component: DocenteReportesPage,
});

function DocenteReportesPage() {
  const user = useCurrentUser("docente");
  return (
    <ReportsView
      title="Reportes y analítica pedagógica"
      description="Rendimiento consolidado, asistencia y seguimiento de tus practicantes asignados."
      estudiantes={studentsOf(user.id)}
    />
  );
}

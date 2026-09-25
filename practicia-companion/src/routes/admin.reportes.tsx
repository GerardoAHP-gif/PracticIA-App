import { createFileRoute } from "@tanstack/react-router";
import { ReportsView } from "@/components/practicia/reports-view";
import { useCurrentUser } from "@/lib/session";
import { students } from "@/lib/data";

export const Route = createFileRoute("/admin/reportes")({
  head: () => ({
    meta: [{ title: "Reportes consolidados — PracticIA Admin" }],
  }),
  component: AdminReportesPage,
});

function AdminReportesPage() {
  useCurrentUser("admin");
  return (
    <ReportsView
      title="Reportes consolidados"
      description="Informes ejecutivos sobre el progreso de las prácticas preprofesionales."
      estudiantes={students}
    />
  );
}

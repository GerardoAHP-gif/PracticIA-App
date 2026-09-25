import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, FileText } from "lucide-react";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { fullName, getPerson, learningSessions, studentsOf } from "@/lib/data";

export const Route = createFileRoute("/docente/sesiones/")({
  head: () => ({
    meta: [
      { title: "Sesiones por revisar — PracticIA" },
      {
        name: "description",
        content:
          "Revisa y evalúa las sesiones de aprendizaje enviadas por tus estudiantes, con apoyo orientativo de la IA.",
      },
      { property: "og:title", content: "Sesiones por revisar — PracticIA" },
      { property: "og:description", content: "Evaluación docente de sesiones de aprendizaje." },
    ],
  }),
  component: SessionsList,
});

function SessionsList() {
  const user = useCurrentUser("docente");
  const mias = studentsOf(user.id).map((s) => s.id);
  const lista = learningSessions.filter((s) => mias.includes(s.estudianteId));

  return (
    <div>
      <PageHeader
        title="Sesiones de aprendizaje"
        description="Las recomendaciones de la IA son orientativas: la evaluación final es tuya."
      />
      {lista.length === 0 && (
        <EmptyState
          icon={FileText}
          title="Sin sesiones"
          description="Cuando tus estudiantes suban sus sesiones, las verás aquí."
        />
      )}
      <div className="space-y-2">
        {lista.map((s) => (
          <Link
            key={s.id}
            to="/docente/sesiones/$sesionId"
            params={{ sesionId: s.id }}
            className="surface-card flex items-center gap-3 p-4 transition-colors hover:border-primary/40"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold">{fullName(getPerson(s.estudianteId))}</p>
              <p className="truncate text-xs text-muted-foreground">{s.titulo}</p>
              <p className="text-[11px] text-muted-foreground">
                Versión {s.version} · {s.actualizado}
              </p>
            </div>
            <StatusBadge status={s.estado} />
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Link>
        ))}
      </div>
    </div>
  );
}
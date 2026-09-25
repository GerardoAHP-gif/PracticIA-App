import { createFileRoute, Link } from "@tanstack/react-router";
import { Sparkles, ArrowLeft, HelpCircle, MessageSquare, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { exportToPdf } from "@/lib/export-pdf";
import { AiReviewView } from "@/components/practicia/ai-review";
import { EmptyState } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { learningSessions } from "@/lib/data";

export const Route = createFileRoute("/estudiante/revision-ia")({
  head: () => ({
    meta: [
      { title: "Recomendaciones de IA — PracticIA" },
      {
        name: "description",
        content: "Revisa las sugerencias de la IA para mejorar tu sesión de aprendizaje.",
      },
    ],
  }),
  component: RevisionIAPage,
});

function RevisionIAPage() {
  const user = useCurrentUser("estudiante");
  const sesion = learningSessions.find((s) => s.estudianteId === user.id && s.revision);

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <Button asChild variant="ghost" size="sm" className="gap-2">
          <Link to="/estudiante/sesiones">
            <ArrowLeft className="h-4 w-4" /> Volver a mi sesión
          </Link>
        </Button>

        {sesion && (
          <Button
            onClick={() => exportToPdf("reporte-ia-content", `Revision_IA_${sesion.titulo.replace(/[^\w]+/g, "_")}_PracticIA`)}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <Download className="h-4 w-4" /> Exportar reporte PDF
          </Button>
        )}
      </div>

      <PageHeader
        title="Recomendaciones de la IA"
        description={sesion ? `Análisis automático pedagógico · ${sesion.titulo} (versión ${sesion.version})` : "Análisis automático pedagógico de tu sesión."}
        {...(sesion ? { action: <StatusBadge status={sesion.estado} /> } : {})}
      />

      {sesion?.revision ? (
        <div id="reporte-ia-content">
          <AiReviewView review={sesion.revision} />
        </div>
      ) : (
        <EmptyState
          icon={Sparkles}
          title="Aún no hay recomendaciones"
          description="Carga tu sesión y pulsa «Enviar a revisión IA» para recibir el análisis."
        />
      )}

      <div className="surface-card mt-4 flex flex-col items-center justify-between gap-4 p-5 sm:flex-row">
        <div className="flex items-center gap-3">
          <HelpCircle className="h-6 w-6 shrink-0 text-primary" />
          <div>
            <p className="text-sm font-bold">¿Necesitas ayuda para aplicar estas sugerencias?</p>
            <p className="text-xs text-muted-foreground">
              Conversa con el Asistente IA para redactar la rúbrica o mejorar las actividades.
            </p>
          </div>
        </div>
        <Button asChild className="shrink-0 gap-2">
          <Link to="/estudiante/asistente">
            <MessageSquare className="h-4 w-4" /> Preguntar al Asistente
          </Link>
        </Button>
      </div>
    </div>
  );
}

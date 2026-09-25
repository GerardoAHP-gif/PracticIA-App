import { AlertCircle, CheckCircle2, Lightbulb, Sparkles } from "lucide-react";
import type { AiReview } from "@/lib/data";

/** Muestra el análisis pedagógico generado por la IA para una sesión. */
export function AiReviewView({ review, subtitle }: { review: AiReview; subtitle?: string }) {
  return (
    <div className="space-y-4">
      <div className="surface-card p-5">
        <div className="mb-3 flex items-center gap-3">
          <span className="gradient-ia flex h-10 w-10 items-center justify-center rounded-xl text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-bold">Resumen de evaluación pedagógica</h2>
            <p className="text-xs text-muted-foreground">
              {subtitle ?? "Generado automáticamente para la versión actual de la sesión."}
              {review.proveedor ? ` · ${review.proveedor}` : ""}
            </p>
          </div>
        </div>
        <p className="text-sm text-foreground/90">{review.resumen}</p>
      </div>

      {review.fortalezas.length > 0 && (
        <Block
          icon={CheckCircle2}
          tone="text-emerald-600 dark:text-emerald-400"
          title="Puntos fuertes identificados"
          items={review.fortalezas}
        />
      )}
      {review.recomendaciones.length > 0 && (
        <Block
          icon={Lightbulb}
          tone="text-primary"
          title="Recomendaciones de mejora"
          items={review.recomendaciones}
          numbered
        />
      )}
      {review.porRevisar.length > 0 && (
        <Block
          icon={AlertCircle}
          tone="text-amber-600 dark:text-amber-400"
          title="Aspectos por revisar"
          items={review.porRevisar}
        />
      )}
      {review.sugerencias.length > 0 && (
        <Block icon={Sparkles} tone="text-ia" title="Sugerencias prácticas" items={review.sugerencias} />
      )}
    </div>
  );
}

function Block({
  icon: Icon,
  tone,
  title,
  items,
  numbered,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  items: string[];
  numbered?: boolean;
}) {
  return (
    <div className="surface-card p-5">
      <div className={`mb-3 flex items-center gap-2 font-semibold ${tone}`}>
        <Icon className="h-5 w-5" />
        <h3>{title}</h3>
      </div>
      {numbered ? (
        <div className="space-y-2 text-sm">
          {items.map((t, i) => (
            <div key={i} className="rounded-lg bg-muted p-3">
              <p className="text-xs text-foreground/90">
                <span className="font-bold text-foreground">{i + 1}.</span> {t}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground">
          {items.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

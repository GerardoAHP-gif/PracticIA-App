import { useEffect, useState } from "react";
import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Eye, FileText, Loader2, RotateCcw, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader, SectionTitle, StatusBadge } from "@/components/practicia/ui-bits";
import { fullName, getPerson, learningSessions } from "@/lib/data";
import { revisarSesion, urlFirmada } from "@/lib/actions";
import { useCurrentUser } from "@/lib/session";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/docente/sesiones/$sesionId")({
  head: () => ({
    meta: [
      { title: "Evaluación de sesión — PracticIA" },
      {
        name: "description",
        content:
          "Revisa el documento, considera las recomendaciones de la IA y registra tu evaluación docente.",
      },
      { property: "og:title", content: "Evaluación de sesión — PracticIA" },
      { property: "og:description", content: "La evaluación final siempre es de la docente." },
    ],
  }),
  component: EvaluatePage,
});

function EvaluatePage() {
  useCurrentUser("docente");
  const { sesionId } = useParams({ from: "/docente/sesiones/$sesionId" });
  const sesion = learningSessions.find((s) => s.id === sesionId);
  const estudiante = getPerson(sesion?.estudianteId);
  const [obs, setObs] = useState("");
  const [nota, setNota] = useState("");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);

  // Rellena el formulario cuando llega la sesión (y si cambia de versión/estado)
  useEffect(() => {
    if (!sesion) return;
    setObs(sesion.observacionesDocente ?? "");
    setNota(sesion.nota != null ? String(sesion.nota) : "");
  }, [sesion?.id, sesion?.estado]);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (sesion?.archivoPath) {
      urlFirmada(sesion.archivoPath).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [sesion?.archivoPath]);

  if (!sesion) {
    return (
      <div>
        <Link to="/docente/sesiones" className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Volver a lista de sesiones
        </Link>
        <p className="surface-card p-6 text-center text-sm text-muted-foreground">
          No encontramos esta sesión o no tienes permiso para verla.
        </p>
      </div>
    );
  }

  const esPdf = /\.pdf$/i.test(sesion.archivo);
  const yaResuelta = sesion.estado === "Aprobada";
  const puedeEvaluar = sesion.estado === "Enviada a docente" || sesion.estado === "Requiere modificaciones" || yaResuelta;

  const decidir = async (aprobar: boolean) => {
    if (aprobar && !nota) {
      toast.error("Selecciona una nota antes de aprobar.");
      return;
    }
    if (!aprobar && !obs.trim()) {
      toast.error("Escribe qué debe modificar la estudiante.");
      return;
    }
    setOcupado(true);
    try {
      await revisarSesion(sesion.id, { aprobar, ...(nota ? { nota: Number(nota) } : {}), observaciones: obs });
      if (aprobar) toast.success(`Sesión de ${fullName(estudiante)} aprobada.`);
      else toast.warning("Se solicitaron modificaciones a la estudiante.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar la evaluación.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div>
      <Link
        to="/docente/sesiones"
        className="mb-4 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Volver a lista de sesiones
      </Link>
      <PageHeader
        title="Evaluación de sesión"
        description={`${fullName(estudiante)} · ${sesion.titulo}`}
        action={<StatusBadge status={sesion.estado} />}
      />

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="surface-card p-5">
          <SectionTitle>Documento entregado</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <FileText className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">{sesion.archivo || "Sin archivo"}</p>
                <p className="text-xs text-muted-foreground">
                  Versión {sesion.version} · Actualizado: {sesion.actualizado}
                </p>
              </div>
            </div>
            <Button variant="outline" size="sm" disabled={!url} onClick={() => setPreviewOpen(true)} className="gap-1.5">
              <Eye className="h-4 w-4" /> Ver documento
            </Button>
          </div>

          {url && esPdf ? (
            <iframe src={url} title={sesion.archivo} className="mt-4 h-72 w-full rounded-xl border border-border" />
          ) : (
            <div className="mt-4 flex h-32 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
              {sesion.archivoPath ? (url ? "Vista previa no disponible para este formato" : "Cargando documento…") : "La estudiante no adjuntó archivo"}
            </div>
          )}

          <div className="mt-5 rounded-xl border border-ia/25 bg-ia/8 p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-ia">
              <Sparkles className="h-4 w-4" /> Recomendaciones de la IA (orientativo)
            </p>
            {sesion.revision ? (
              <>
                <p className="mt-2 text-sm text-foreground/90">{sesion.revision.resumen}</p>
                <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                  {sesion.revision.recomendaciones.map((r, i) => (
                    <li key={i}>· {r}</li>
                  ))}
                </ul>
                {sesion.revision.porRevisar.length > 0 && (
                  <>
                    <p className="mt-3 text-xs font-semibold text-foreground">Aspectos por revisar</p>
                    <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                      {sesion.revision.porRevisar.map((r, i) => (
                        <li key={i}>· {r}</li>
                      ))}
                    </ul>
                  </>
                )}
              </>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">La estudiante aún no generó recomendaciones de IA para esta versión.</p>
            )}
          </div>
        </div>

        <div className="surface-card h-fit p-5">
          <SectionTitle>Tu evaluación docente</SectionTitle>
          {!puedeEvaluar && (
            <p className="mb-4 rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              La estudiante aún no envió esta sesión para evaluación (estado: {sesion.estado}).
            </p>
          )}
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="obs">Observaciones / retroalimentación</Label>
              <Textarea
                id="obs"
                rows={5}
                value={obs}
                onChange={(e) => setObs(e.target.value)}
                placeholder="Escribe tu retroalimentación para la estudiante..."
                disabled={!puedeEvaluar}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="nota">Calificación (vigesimal)</Label>
              <Select value={nota} onValueChange={setNota} disabled={!puedeEvaluar}>
                <SelectTrigger id="nota">
                  <SelectValue placeholder="Selecciona una nota" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 21 }, (_, i) => String(20 - i)).map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2 pt-2">
              <Button
                className="h-11 bg-emerald-600 text-white hover:bg-emerald-700"
                disabled={!puedeEvaluar || ocupado}
                onClick={() => decidir(true)}
              >
                {ocupado ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />} Aprobar sesión
              </Button>
              <Button
                variant="outline"
                className="h-11 border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/20"
                disabled={!puedeEvaluar || ocupado || yaResuelta}
                onClick={() => decidir(false)}
              >
                <RotateCcw className="h-4 w-4" /> Solicitar modificaciones
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{sesion.archivo}</DialogTitle>
            <DialogDescription>Documento de {fullName(estudiante)}</DialogDescription>
          </DialogHeader>
          {url &&
            (esPdf ? (
              <iframe src={url} title={sesion.archivo} className="h-[65vh] w-full rounded-xl border border-border" />
            ) : (
              <Button asChild>
                <a href={url} target="_blank" rel="noopener noreferrer">
                  Abrir archivo
                </a>
              </Button>
            ))}
        </DialogContent>
      </Dialog>
    </div>
  );
}

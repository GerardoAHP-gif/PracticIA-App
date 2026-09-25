import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  FileText,
  History,
  Loader2,
  Send,
  Sparkles,
  Upload,
  Eye,
  MessageSquareText,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, SectionTitle, StatusBadge, Timeline } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { fmtDate, learningSessions, practicesOf, type LearningSession } from "@/lib/data";
import {
  analizarSesionIA,
  enviarSesionADocente,
  MAX_FILE_MB,
  subirSesion,
  urlFirmada,
} from "@/lib/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/estudiante/sesiones")({
  head: () => ({
    meta: [
      { title: "Mi sesión de aprendizaje — PracticIA" },
      {
        name: "description",
        content:
          "Carga tu sesión de aprendizaje, recibe recomendaciones de IA y envíala a tu docente para su evaluación.",
      },
      { property: "og:title", content: "Mi sesión de aprendizaje — PracticIA" },
      { property: "og:description", content: "Carga, revisión con IA y envío a docente." },
    ],
  }),
  component: SessionPage,
});

function SessionPage() {
  const user = useCurrentUser("estudiante");
  const practica = practicesOf(user.id).find((p) => p.estado !== "Finalizada");
  const mias = learningSessions.filter((s) => s.estudianteId === user.id);

  const [selId, setSelId] = useState<string | null>(null);
  const base: LearningSession | undefined =
    mias.find((s) => s.id === selId) ?? mias.find((s) => s.practicaId === practica?.id) ?? mias[0];

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorArchivo, setErrorArchivo] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<null | "subiendo" | "ia" | "enviando">(null);
  const [titulo, setTitulo] = useState(practica?.sesion ?? "");
  const nuevaRef = useRef<HTMLInputElement>(null);
  const primeraRef = useRef<HTMLInputElement>(null);

  const estado = base?.estado;
  const analizando = estado === "IA analizando" || ocupado === "ia";

  const validar = (f: File): boolean => {
    if (f.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorArchivo(`El archivo supera el límite de ${MAX_FILE_MB} MB. Comprime el documento e inténtalo nuevamente.`);
      return false;
    }
    if (!/pdf|word|officedocument/i.test(f.type) && !/\.(pdf|docx?)$/i.test(f.name)) {
      setErrorArchivo("Solo se admiten archivos PDF o Word (.doc, .docx).");
      return false;
    }
    setErrorArchivo(null);
    return true;
  };

  const subirPrimera = async (file: File) => {
    if (!validar(file)) return;
    if (!titulo.trim()) {
      setErrorArchivo("Escribe el título de la sesión.");
      return;
    }
    setOcupado("subiendo");
    try {
      const id = await subirSesion({ titulo: titulo.trim(), file, ...(practica ? { practicaId: practica.id } : {}) });
      setSelId(id);
      toast.success("Sesión cargada correctamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setOcupado(null);
    }
  };

  const subirVersion = async (file: File) => {
    if (!base || !validar(file)) return;
    setOcupado("subiendo");
    try {
      await subirSesion({ titulo: base.titulo, file, sesionId: base.id });
      toast.success("Nueva versión cargada correctamente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo subir el archivo.");
    } finally {
      setOcupado(null);
    }
  };

  const enviarIA = async () => {
    if (!base) return;
    setOcupado("ia");
    try {
      await analizarSesionIA(base);
      toast.success("La IA terminó de analizar tu sesión.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "La IA no pudo analizar la sesión. Inténtalo otra vez.");
    } finally {
      setOcupado(null);
    }
  };

  const enviarDocente = async () => {
    if (!base) return;
    setOcupado("enviando");
    try {
      await enviarSesionADocente(base.id);
      setConfirmOpen(false);
      toast.success("Sesión enviada a tu docente.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo enviar la sesión.");
    } finally {
      setOcupado(null);
    }
  };

  const abrirVista = async () => {
    if (!base?.archivoPath) return;
    setPreviewOpen(true);
    setPreviewUrl(null);
    setPreviewUrl(await urlFirmada(base.archivoPath));
  };

  /* ---------- Aún no hay ninguna sesión: primer envío ---------- */
  if (!base) {
    return (
      <div>
        <PageHeader
          title="Mi sesión de aprendizaje"
          description={practica ? `${practica.sesion} · ${fmtDate(practica.fecha)}` : "Carga tu sesión para recibir recomendaciones de la IA."}
        />
        {errorArchivo && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{errorArchivo}</AlertDescription>
          </Alert>
        )}
        <div className="surface-card max-w-xl space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="titulo-sesion">Título de la sesión</Label>
            <Input
              id="titulo-sesion"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              placeholder="Ej. Sesión 04 · Números hasta el 10"
            />
          </div>
          <input
            ref={primeraRef}
            type="file"
            hidden
            accept=".pdf,.doc,.docx,application/pdf"
            onChange={(e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) void subirPrimera(f);
            }}
          />
          <Button className="h-11 w-full" disabled={ocupado === "subiendo"} onClick={() => primeraRef.current?.click()}>
            {ocupado === "subiendo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {ocupado === "subiendo" ? "Subiendo..." : "Seleccionar archivo (PDF o Word)"}
          </Button>
          <p className="text-[11px] text-muted-foreground">
            Tamaño máximo {MAX_FILE_MB} MB. La IA analiza el contenido completo de archivos PDF; con Word (.doc/.docx) da
            orientación general basada solo en el título.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Mi sesión de aprendizaje"
        description={`${base.titulo}${practica ? ` · ${fmtDate(practica.fecha)}` : ""}`}
        action={<StatusBadge status={estado ?? ""} />}
      />

      {mias.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {mias.map((s) => (
            <Button key={s.id} size="sm" variant={s.id === base.id ? "default" : "outline"} onClick={() => setSelId(s.id)}>
              {s.titulo}
            </Button>
          ))}
        </div>
      )}

      {errorArchivo && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorArchivo}</AlertDescription>
        </Alert>
      )}

      {estado === "Requiere modificaciones" && (
        <Alert className="mb-4">
          <AlertDescription>
            <strong>Tu docente solicitó cambios.</strong> {base.observacionesDocente ?? "Revisa sus observaciones y carga una nueva versión."}
          </AlertDescription>
        </Alert>
      )}
      {estado === "Aprobada" && (
        <Alert className="mb-4">
          <AlertDescription>
            <strong>Sesión aprobada{base.nota != null ? ` · Nota ${base.nota}` : ""}.</strong>{" "}
            {base.observacionesDocente ?? ""}
          </AlertDescription>
        </Alert>
      )}

      <input
        ref={nuevaRef}
        type="file"
        hidden
        accept=".pdf,.doc,.docx,application/pdf"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void subirVersion(f);
        }}
      />

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div className="surface-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileText className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-bold">{base.archivo || "Sin archivo"}</p>
              <p className="text-xs text-muted-foreground">
                Versión {base.version} · Actualizado {base.actualizado}
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant="outline" className="h-11" disabled={!base.archivoPath} onClick={abrirVista}>
              <Eye className="h-4 w-4" /> Visualizar archivo
            </Button>
            <Button
              variant="outline"
              className="h-11"
              disabled={ocupado !== null || estado === "Aprobada" || estado === "Enviada a docente"}
              onClick={() => nuevaRef.current?.click()}
            >
              {ocupado === "subiendo" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Cargar nueva versión
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              className="h-11"
              disabled={analizando || ocupado !== null || estado === "Aprobada" || estado === "Enviada a docente"}
              onClick={enviarIA}
              variant="secondary"
            >
              {analizando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {analizando ? "IA analizando..." : "Enviar a revisión IA"}
            </Button>
            <Button
              className="h-11"
              disabled={estado !== "Recomendaciones disponibles" || ocupado !== null}
              onClick={() => setConfirmOpen(true)}
            >
              <Send className="h-4 w-4" /> Enviar a docente
            </Button>
          </div>

          <div className="mt-4 flex items-center justify-between gap-2 rounded-xl bg-muted p-3">
            <div className="flex items-center gap-2">
              <MessageSquareText className="h-4 w-4 text-primary" />
              <span className="text-xs font-medium">¿Quieres ayuda redactando o ajustando esta sesión?</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/estudiante/asistente">Abrir Asistente</Link>
            </Button>
          </div>

          {base.revision && (
            <Link
              to="/estudiante/revision-ia"
              className="mt-4 flex items-center gap-3 rounded-xl border border-ia/25 bg-ia/8 px-4 py-3"
            >
              <Sparkles className="h-5 w-5 text-ia" />
              <span className="text-sm font-semibold">Ver recomendaciones de la IA para esta versión</span>
            </Link>
          )}
        </div>

        <div className="surface-card p-5">
          <SectionTitle>Seguimiento de la sesión</SectionTitle>
          <Timeline
            items={[
              {
                title: `Versión ${base.version} cargada`,
                detail: "Documento disponible para revisión",
                time: base.actualizado,
                done: true,
              },
              {
                title: "Recomendaciones IA generadas",
                detail: base.revision
                  ? `${base.revision.recomendaciones.length} recomendaciones y ${base.revision.porRevisar.length} aspectos por revisar`
                  : "Pendiente de análisis",
                time: "—",
                done: !!base.revision && estado !== "Pendiente de revisión IA",
              },
              {
                title: "Enviada a docente",
                detail: "Pendiente de evaluación",
                time: "—",
                done: estado === "Enviada a docente" || estado === "Aprobada",
              },
              {
                title: "Evaluación docente",
                detail: "La docente aprueba o solicita modificaciones",
                time: "—",
                done: estado === "Aprobada",
              },
            ]}
          />
          <div className="mt-5 flex items-start gap-2 rounded-lg bg-muted p-3 text-[11px] text-muted-foreground">
            <History className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Al cargar una nueva versión se reemplaza el archivo actual y el número de versión aumenta.
          </div>
        </div>
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate">{base.archivo}</DialogTitle>
            <DialogDescription>Vista previa del documento cargado.</DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            /\.pdf$/i.test(base.archivo) ? (
              <iframe src={previewUrl} title={base.archivo} className="h-[60vh] w-full rounded-xl border border-border" />
            ) : (
              <Button asChild className="h-11">
                <a href={previewUrl} target="_blank" rel="noopener noreferrer">
                  Abrir archivo
                </a>
              </Button>
            )
          ) : (
            <div className="flex h-64 items-center justify-center rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Cargando documento...
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>¿Enviar la sesión a tu docente?</DialogTitle>
            <DialogDescription>
              Tu docente recibirá la versión {base.version} junto con las recomendaciones de la IA. Podrás volver a
              editarla si te solicita modificaciones.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={enviarDocente} disabled={ocupado === "enviando"}>
              {ocupado === "enviando" && <Loader2 className="h-4 w-4 animate-spin" />} Enviar a docente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

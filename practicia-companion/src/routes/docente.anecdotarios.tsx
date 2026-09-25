import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FileText, Loader2, NotebookPen } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { anecdotes, fullName, getPerson, studentsOf, type Anecdote } from "@/lib/data";
import { abrirArchivo, revisarAnecdotario } from "@/lib/actions";

export const Route = createFileRoute("/docente/anecdotarios")({
  head: () => ({
    meta: [
      { title: "Anecdotarios — PracticIA" },
      {
        name: "description",
        content:
          "Revisa los anecdotarios enviados por tus estudiantes y solicita modificaciones cuando sea necesario.",
      },
      { property: "og:title", content: "Anecdotarios — PracticIA" },
      { property: "og:description", content: "Reflexiones de práctica listas para revisión." },
    ],
  }),
  component: TeacherAnecdotes,
});

function TeacherAnecdotes() {
  const user = useCurrentUser("docente");
  const mias = studentsOf(user.id).map((s) => s.id);
  const items = anecdotes.filter((a) => mias.includes(a.estudianteId));
  const [sel, setSel] = useState<Anecdote | null>(null);
  const [obs, setObs] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const abrir = (a: Anecdote) => {
    setSel(a);
    setObs(a.observaciones ?? "");
  };

  const decidir = async (estado: "Revisado" | "Requiere modificación") => {
    if (!sel) return;
    if (estado === "Requiere modificación" && !obs.trim()) {
      toast.error("Explica qué debe corregir la estudiante.");
      return;
    }
    setOcupado(true);
    try {
      await revisarAnecdotario(sel.id, estado, obs);
      toast.success(estado === "Revisado" ? "Anecdotario marcado como revisado." : "Se solicitó la modificación.");
      setSel(null);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setOcupado(false);
    }
  };

  return (
    <div>
      <PageHeader title="Anecdotarios" description="Documentos reflexivos enviados por tus estudiantes." />
      {items.length === 0 ? (
        <EmptyState
          icon={NotebookPen}
          title="Sin anecdotarios"
          description="Cuando tus estudiantes envíen sus anecdotarios, aparecerán aquí para tu revisión."
        />
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <article key={a.id} className="surface-card flex flex-wrap items-center gap-3 p-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <NotebookPen className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{fullName(getPerson(a.estudianteId))}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {a.nombre} · {a.fecha}
                </p>
              </div>
              <StatusBadge status={a.estado} />
              <Button size="sm" variant="outline" onClick={() => abrir(a)}>
                Revisar
              </Button>
            </article>
          ))}
        </div>
      )}

      <Dialog open={!!sel} onOpenChange={(o) => !o && setSel(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revisar anecdotario</DialogTitle>
            <DialogDescription>
              {sel ? `${fullName(getPerson(sel.estudianteId))} · ${sel.nombre}` : ""}
            </DialogDescription>
          </DialogHeader>
          {sel?.archivoPath && (
            <Button
              variant="outline"
              onClick={() => abrirArchivo(sel.archivoPath).catch((e) => toast.error(e.message))}
            >
              <FileText className="h-4 w-4" /> Abrir documento
            </Button>
          )}
          <Textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Observaciones para la estudiante (obligatorio si solicitas modificaciones)"
            rows={4}
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" disabled={ocupado} onClick={() => decidir("Requiere modificación")}>
              Solicitar modificación
            </Button>
            <Button disabled={ocupado} onClick={() => decidir("Revisado")}>
              {ocupado && <Loader2 className="h-4 w-4 animate-spin" />} Marcar como revisado
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

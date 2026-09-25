import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import {
  fmtDate,
  fullName,
  getInstitution,
  getPerson,
  institutions,
  practices,
  students,
  teachers,
  todayISO,
  type Practice,
  type PracticeStatus,
} from "@/lib/data";
import { eliminarPractica, guardarPractica } from "@/lib/actions";

export const Route = createFileRoute("/admin/practicas")({
  head: () => ({
    meta: [
      { title: "Gestión de prácticas — PracticIA" },
      {
        name: "description",
        content:
          "Programa prácticas asignando estudiante, docente, institución, fecha, hora y sesión de aprendizaje.",
      },
      { property: "og:title", content: "Gestión de prácticas — PracticIA" },
      { property: "og:description", content: "Programación completa del calendario de prácticas." },
    ],
  }),
  component: PracticesPage,
});

const NONE = "none";
const ESTADOS: PracticeStatus[] = ["Pendiente", "En preparación", "Aprobada", "En camino", "Llegada registrada", "Finalizada"];

interface Form {
  estudianteId: string;
  docenteId: string;
  institucionId: string;
  fecha: string;
  hora: string;
  sesion: string;
  estado: PracticeStatus;
}
const vacio = (): Form => ({
  estudianteId: "",
  docenteId: NONE,
  institucionId: NONE,
  fecha: todayISO(),
  hora: "08:00",
  sesion: "",
  estado: "Pendiente",
});

function PracticesPage() {
  useCurrentUser("admin");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Practice | null>(null);
  const [form, setForm] = useState<Form>(vacio());
  const [guardando, setGuardando] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const abrir = (p: Practice | null) => {
    setEditing(p);
    setForm(
      p
        ? {
            estudianteId: p.estudianteId,
            docenteId: p.docenteId || NONE,
            institucionId: p.institucionId || NONE,
            fecha: p.fecha,
            hora: p.hora,
            sesion: p.sesion,
            estado: p.estado,
          }
        : vacio(),
    );
    setOpen(true);
  };

  // Al elegir estudiante, propone su docente e institución asignados
  const elegirEstudiante = (id: string) => {
    const est = getPerson(id);
    setForm((f) => ({
      ...f,
      estudianteId: id,
      docenteId: f.docenteId === NONE && est?.docenteId ? est.docenteId : f.docenteId,
      institucionId: f.institucionId === NONE && est?.institucionId ? est.institucionId : f.institucionId,
    }));
  };

  const guardar = async () => {
    setGuardando(true);
    try {
      await guardarPractica({
        ...(editing ? { id: editing.id } : {}),
        estudianteId: form.estudianteId,
        docenteId: form.docenteId === NONE ? "" : form.docenteId,
        institucionId: form.institucionId === NONE ? "" : form.institucionId,
        fecha: form.fecha,
        hora: form.hora,
        sesion: form.sesion,
        estado: form.estado,
      });
      toast.success(editing ? "Práctica actualizada." : "Práctica programada correctamente.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (p: Practice) => {
    if (!window.confirm("¿Eliminar esta práctica?")) return;
    try {
      await eliminarPractica(p.id);
      toast.success("Práctica eliminada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Prácticas"
        description="Programación de prácticas profesionales por estudiante e institución."
        action={
          <Button className="h-10" onClick={() => abrir(null)}>
            <Plus className="h-4 w-4" /> Crear práctica
          </Button>
        }
      />

      {practices.length === 0 ? (
        <EmptyState
          icon={CalendarDays}
          title="Aún no hay prácticas programadas"
          description="Crea la primera práctica asignando estudiante, docente e institución."
        />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-muted/60 text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold">Estudiante</th>
                <th className="px-4 py-2.5 text-left font-bold">Docente</th>
                <th className="px-4 py-2.5 text-left font-bold">Institución</th>
                <th className="px-4 py-2.5 text-left font-bold">Fecha</th>
                <th className="px-4 py-2.5 text-left font-bold">Hora</th>
                <th className="px-4 py-2.5 text-left font-bold">Sesión</th>
                <th className="px-4 py-2.5 text-left font-bold">Estado</th>
                <th className="px-4 py-2.5 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {practices.map((p) => (
                <tr key={p.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{fullName(getPerson(p.estudianteId))}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.docenteId ? fullName(getPerson(p.docenteId)) : "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{getInstitution(p.institucionId)?.nombre ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{fmtDate(p.fecha)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.hora}</td>
                  <td className="px-4 py-3 text-muted-foreground">{p.sesion}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={p.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrir(p)} aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => borrar(p)} aria-label="Eliminar">
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar práctica" : "Crear práctica"}</DialogTitle>
            <DialogDescription>Asigna estudiante, docente e institución para programar la práctica.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Estudiante</Label>
              <Select value={form.estudianteId} onValueChange={elegirEstudiante}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {fullName(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Docente</Label>
              <Select value={form.docenteId} onValueChange={(v) => set("docenteId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {fullName(t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Institución</Label>
              <Select value={form.institucionId} onValueChange={(v) => set("institucionId", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Sin asignar</SelectItem>
                  {institutions.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fecha">Fecha</Label>
              <Input id="fecha" type="date" value={form.fecha} onChange={(e) => set("fecha", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="hora">Hora</Label>
              <Input id="hora" type="time" value={form.hora} onChange={(e) => set("hora", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="sesion">Sesión</Label>
              <Input id="sesion" value={form.sesion} onChange={(e) => set("sesion", e.target.value)} placeholder="Sesión 05 · Nociones espaciales" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Estado</Label>
              <Select value={form.estado} onValueChange={(v) => set("estado", v as PracticeStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS.map((e) => (
                    <SelectItem key={e} value={e}>
                      {e}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />} {editing ? "Guardar cambios" : "Crear práctica"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, LocateFixed, Loader2, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
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
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { RealMap } from "@/components/practicia/real-map";
import { useCurrentUser } from "@/lib/session";
import { institutions, type Institution } from "@/lib/data";
import { eliminarInstitucion, guardarInstitucion, obtenerUbicacion } from "@/lib/actions";

export const Route = createFileRoute("/admin/instituciones")({
  head: () => ({
    meta: [
      { title: "Instituciones educativas — PracticIA" },
      {
        name: "description",
        content:
          "Registra instituciones con dirección, distrito, provincia, departamento y coordenadas confirmadas en el mapa.",
      },
      { property: "og:title", content: "Instituciones educativas — PracticIA" },
      { property: "og:description", content: "Sedes de práctica y sus coordenadas validadas." },
    ],
  }),
  component: InstitutionsPage,
});

interface Form {
  nombre: string;
  direccion: string;
  distrito: string;
  provincia: string;
  departamento: string;
  latitud: string;
  longitud: string;
  radio: string;
  toleranciaPuntual: string;
  toleranciaFalta: string;
  estado: "Activa" | "Inactiva";
}
const vacio: Form = {
  nombre: "",
  direccion: "",
  distrito: "",
  provincia: "",
  departamento: "",
  latitud: "",
  longitud: "",
  radio: "100",
  toleranciaPuntual: "10",
  toleranciaFalta: "30",
  estado: "Activa",
};

function InstitutionsPage() {
  useCurrentUser("admin");
  const rows = institutions;
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Institution | null>(null);
  const [form, setForm] = useState<Form>(vacio);
  const [guardando, setGuardando] = useState(false);
  const [ubicando, setUbicando] = useState(false);
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const abrir = (i: Institution | null) => {
    setEditing(i);
    setForm(
      i
        ? {
            nombre: i.nombre,
            direccion: i.direccion,
            distrito: i.distrito,
            provincia: i.provincia,
            departamento: i.departamento,
            latitud: i.latitud ? String(i.latitud) : "",
            longitud: i.longitud ? String(i.longitud) : "",
            radio: String(i.radio),
            toleranciaPuntual: String(i.toleranciaPuntualMin),
            toleranciaFalta: String(i.toleranciaFaltaMin),
            estado: i.estado,
          }
        : vacio,
    );
    setOpen(true);
  };

  const usarMiUbicacion = async () => {
    setUbicando(true);
    try {
      const u = await obtenerUbicacion();
      set("latitud", u.lat.toFixed(6));
      set("longitud", u.lng.toFixed(6));
      toast.success("Coordenadas tomadas de tu ubicación actual.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo obtener la ubicación.");
    } finally {
      setUbicando(false);
    }
  };

  const lat = form.latitud.trim() === "" ? undefined : Number(form.latitud);
  const lng = form.longitud.trim() === "" ? undefined : Number(form.longitud);
  const coordsOk = (lat === undefined && lng === undefined) || (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat!) <= 90 && Math.abs(lng!) <= 180);

  const guardar = async () => {
    if (!form.nombre.trim()) return void toast.error("El nombre es obligatorio.");
    if (!coordsOk) return void toast.error("Las coordenadas no son válidas (latitud -90 a 90, longitud -180 a 180).");
    const radio = Number(form.radio);
    if (!Number.isFinite(radio) || radio < 10 || radio > 5000) return void toast.error("El radio debe estar entre 10 y 5000 metros.");
    setGuardando(true);
    try {
      await guardarInstitucion({
        ...(editing ? { id: editing.id } : {}),
        nombre: form.nombre,
        direccion: form.direccion,
        distrito: form.distrito,
        provincia: form.provincia,
        departamento: form.departamento,
        ...(lat !== undefined ? { latitud: lat } : {}),
        ...(lng !== undefined ? { longitud: lng } : {}),
        radio,
        toleranciaPuntualMin: Number(form.toleranciaPuntual) || 10,
        toleranciaFaltaMin: Number(form.toleranciaFalta) || 30,
        estado: form.estado,
      });
      toast.success("Institución guardada.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (i: Institution) => {
    if (!window.confirm(`¿Eliminar ${i.nombre}? Las prácticas asociadas quedarán sin institución.`)) return;
    try {
      await eliminarInstitucion(i.id);
      toast.success("Institución eliminada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    }
  };

  return (
    <div>
      <PageHeader
        title="Instituciones"
        description="Sedes donde las estudiantes realizan sus prácticas profesionales."
        action={
          <Button className="h-10" onClick={() => abrir(null)}>
            <Plus className="h-4 w-4" /> Nueva institución
          </Button>
        }
      />

      {rows.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Aún no hay instituciones"
          description="Registra la primera sede con «Nueva institución». Sus coordenadas se usan para validar la asistencia."
        />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((i) => (
            <article key={i.id} className="surface-card p-4">
              <div className="flex items-start gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Building2 className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold">{i.nombre}</p>
                  <p className="truncate text-xs text-muted-foreground">{i.direccion || "Sin dirección"}</p>
                </div>
                <StatusBadge status={i.estado} />
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {[i.distrito, i.provincia, i.departamento].filter(Boolean).join(" · ") || "Sin ubicación administrativa"}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="h-3.5 w-3.5" />
                {i.latitud || i.longitud ? `${i.latitud.toFixed(4)}, ${i.longitud.toFixed(4)} · radio ${i.radio} m` : "Sin coordenadas"}
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="outline" className="flex-1" onClick={() => abrir(i)}>
                  <Pencil className="h-3.5 w-3.5" /> Editar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => borrar(i)} aria-label="Eliminar">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </div>
            </article>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar institución" : "Nueva institución"}</DialogTitle>
            <DialogDescription>
              Las coordenadas se usan para comprobar que la estudiante llegó a la institución.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="nombre">Nombre</Label>
              <Input id="nombre" value={form.nombre} onChange={(e) => set("nombre", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="dir">Dirección</Label>
              <Input id="dir" value={form.direccion} onChange={(e) => set("direccion", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dis">Distrito</Label>
              <Input id="dis" value={form.distrito} onChange={(e) => set("distrito", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pro">Provincia</Label>
              <Input id="pro" value={form.provincia} onChange={(e) => set("provincia", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dep">Departamento</Label>
              <Input id="dep" value={form.departamento} onChange={(e) => set("departamento", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rad">Radio permitido (m)</Label>
              <Input id="rad" inputMode="numeric" value={form.radio} onChange={(e) => set("radio", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tolp">Minutos tolerancia "Puntual"</Label>
              <Input id="tolp" inputMode="numeric" value={form.toleranciaPuntual} onChange={(e) => set("toleranciaPuntual", e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Después de la hora programada, hasta cuántos minutos aún cuenta como puntual.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tolf">Minutos de gracia antes de "Falta"</Label>
              <Input id="tolf" inputMode="numeric" value={form.toleranciaFalta} onChange={(e) => set("toleranciaFalta", e.target.value)} />
              <p className="text-[11px] text-muted-foreground">Usado solo en reportes: sin registro pasado este tiempo, se cuenta como falta.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lat">Latitud</Label>
              <Input id="lat" inputMode="decimal" value={form.latitud} onChange={(e) => set("latitud", e.target.value)} placeholder="-13.5170" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lon">Longitud</Label>
              <Input id="lon" inputMode="decimal" value={form.longitud} onChange={(e) => set("longitud", e.target.value)} placeholder="-71.9785" />
            </div>
            {editing && (
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Estado</Label>
                <div className="flex gap-2">
                  {(["Activa", "Inactiva"] as const).map((e) => (
                    <Button key={e} type="button" size="sm" variant={form.estado === e ? "default" : "outline"} onClick={() => set("estado", e)}>
                      {e}
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button type="button" variant="outline" onClick={usarMiUbicacion} disabled={ubicando}>
            {ubicando ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />} Usar mi ubicación actual
          </Button>

          <div className="space-y-2">
            <Label>Vista del mapa</Label>
            <RealMap
              className="h-44"
              {...(coordsOk && lat !== undefined && lng !== undefined ? { lat, lng } : {})}
            />
            <p className="text-[11px] text-muted-foreground">
              Tip: en Google Maps, mantén presionado el punto de la puerta de la institución y copia las coordenadas.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={guardar} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

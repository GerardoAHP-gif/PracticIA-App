import { useState } from "react";
import { Copy, KeyRound, Loader2, Pencil, Plus, Search, Trash2, UserCheck, UserX } from "lucide-react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, PageHeader, StatusBadge } from "./ui-bits";
import { fullName, institutions, people, teachers, useDataVersion, type Person, type Role } from "@/lib/data";
import { roleLabel } from "@/lib/session";
import { actualizarUsuario, crearUsuario, eliminarUsuario } from "@/lib/actions";

const NONE = "none";

interface Form {
  nombres: string;
  apellidos: string;
  correo: string;
  rol: Role;
  estado: "Activo" | "Inactivo";
  programa: string;
  ciclo: string;
  docenteId: string;
  institucionId: string;
}

const vacio = (rol: Role): Form => ({
  nombres: "",
  apellidos: "",
  correo: "",
  rol,
  estado: "Activo",
  programa: "",
  ciclo: "",
  docenteId: NONE,
  institucionId: NONE,
});

export function UserTable({
  title,
  description,
  roles,
}: {
  title: string;
  description: string;
  roles: Role[];
}) {
  useDataVersion();
  const rows = people.filter((p) => roles.includes(p.rol));
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Person | null>(null);
  const [form, setForm] = useState<Form>(vacio(roles[0] ?? "estudiante"));
  const [guardando, setGuardando] = useState(false);
  const [aBorrar, setABorrar] = useState<Person | null>(null);
  const [credenciales, setCredenciales] = useState<{ correo: string; password: string } | null>(null);

  const filtered = rows.filter((r) => `${r.nombres} ${r.apellidos} ${r.correo}`.toLowerCase().includes(q.toLowerCase()));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  const abrirNuevo = () => {
    setEditing(null);
    setForm(vacio(roles[0] ?? "estudiante"));
    setOpen(true);
  };
  const abrirEditar = (p: Person) => {
    setEditing(p);
    setForm({
      nombres: p.nombres,
      apellidos: p.apellidos,
      correo: p.correo,
      rol: p.rol,
      estado: p.estado,
      programa: p.programa ?? "",
      ciclo: p.ciclo ?? "",
      docenteId: p.docenteId ?? NONE,
      institucionId: p.institucionId ?? NONE,
    });
    setOpen(true);
  };

  const guardar = async () => {
    if (!form.nombres.trim()) return void toast.error("Los nombres son obligatorios.");
    if (!editing && !/^\S+@\S+\.\S+$/.test(form.correo.trim())) return void toast.error("Ingresa un correo válido.");
    setGuardando(true);
    try {
      const comun = {
        nombres: form.nombres.trim(),
        apellidos: form.apellidos.trim(),
        rol: form.rol,
        programa: form.programa.trim(),
        ciclo: form.ciclo.trim(),
        docenteId: form.docenteId === NONE ? "" : form.docenteId,
        institucionId: form.institucionId === NONE ? "" : form.institucionId,
      };
      if (editing) {
        await actualizarUsuario(editing.id, { ...comun, estado: form.estado });
        toast.success("Usuario actualizado.");
      } else {
        const res = await crearUsuario({ ...comun, correo: form.correo.trim().toLowerCase() });
        setCredenciales({ correo: form.correo.trim().toLowerCase(), password: res.passwordTemporal });
        toast.success("Usuario creado.");
      }
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  };

  const toggle = async (p: Person) => {
    try {
      await actualizarUsuario(p.id, { estado: p.estado === "Activo" ? "Inactivo" : "Activo" });
      toast.success("Estado del usuario actualizado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  };

  const borrar = async () => {
    if (!aBorrar) return;
    try {
      await eliminarUsuario(aBorrar.id);
      toast.success("Usuario eliminado.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo eliminar.");
    } finally {
      setABorrar(null);
    }
  };

  return (
    <div>
      <PageHeader
        title={title}
        description={description}
        action={
          <Button className="h-10" onClick={abrirNuevo}>
            <Plus className="h-4 w-4" /> Nuevo usuario
          </Button>
        }
      />

      <div className="relative mb-4">
        <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o correo..." className="h-11 bg-card pl-9" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={UserX} title="Sin usuarios" description="No hay usuarios que coincidan. Crea uno con «Nuevo usuario»." />
      ) : (
        <div className="surface-card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="bg-muted/60 text-[11px] tracking-wide text-muted-foreground uppercase">
              <tr>
                <th className="px-4 py-2.5 text-left font-bold">Nombres</th>
                <th className="px-4 py-2.5 text-left font-bold">Apellidos</th>
                <th className="px-4 py-2.5 text-left font-bold">Correo</th>
                <th className="px-4 py-2.5 text-left font-bold">Rol</th>
                <th className="px-4 py-2.5 text-left font-bold">Estado</th>
                <th className="px-4 py-2.5 text-right font-bold">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-t border-border">
                  <td className="px-4 py-3 font-semibold">{r.nombres}</td>
                  <td className="px-4 py-3">{r.apellidos}</td>
                  <td className="px-4 py-3 text-muted-foreground">{r.correo}</td>
                  <td className="px-4 py-3 text-muted-foreground">{roleLabel[r.rol]}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={r.estado} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="ghost" onClick={() => abrirEditar(r)} aria-label="Editar">
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => toggle(r)} aria-label="Activar o desactivar">
                        {r.estado === "Activo" ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setABorrar(r)} aria-label="Eliminar">
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
            <DialogTitle>{editing ? "Editar usuario" : "Nuevo usuario"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "El correo no se puede cambiar desde aquí."
                : "Se creará la cuenta con una contraseña temporal que verás al guardar."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="n">Nombres</Label>
              <Input id="n" value={form.nombres} onChange={(e) => set("nombres", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="a">Apellidos</Label>
              <Input id="a" value={form.apellidos} onChange={(e) => set("apellidos", e.target.value)} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="c">Correo</Label>
              <Input id="c" type="email" value={form.correo} readOnly={!!editing} onChange={(e) => set("correo", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rol">Rol</Label>
              <Select value={form.rol} onValueChange={(v) => set("rol", v as Role)}>
                <SelectTrigger id="rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="estudiante">Estudiante</SelectItem>
                  <SelectItem value="docente">Docente</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editing && (
              <div className="space-y-1.5">
                <Label htmlFor="est">Estado</Label>
                <Select value={form.estado} onValueChange={(v) => set("estado", v as Form["estado"])}>
                  <SelectTrigger id="est">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="Inactivo">Inactivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.rol !== "admin" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="prog">{form.rol === "docente" ? "Especialidad" : "Programa"}</Label>
                  <Input id="prog" value={form.programa} onChange={(e) => set("programa", e.target.value)} placeholder="Educación Inicial" />
                </div>
                {form.rol === "estudiante" && (
                  <div className="space-y-1.5">
                    <Label htmlFor="ciclo">Ciclo</Label>
                    <Input id="ciclo" value={form.ciclo} onChange={(e) => set("ciclo", e.target.value)} placeholder="VIII" />
                  </div>
                )}
              </>
            )}
            {form.rol === "estudiante" && (
              <>
                <div className="space-y-1.5">
                  <Label htmlFor="doc">Docente asignado</Label>
                  <Select value={form.docenteId} onValueChange={(v) => set("docenteId", v)}>
                    <SelectTrigger id="doc">
                      <SelectValue />
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
                <div className="space-y-1.5">
                  <Label htmlFor="ins">Institución</Label>
                  <Select value={form.institucionId} onValueChange={(v) => set("institucionId", v)}>
                    <SelectTrigger id="ins">
                      <SelectValue />
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
              </>
            )}
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

      <Dialog open={!!credenciales} onOpenChange={(o) => !o && setCredenciales(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" /> Cuenta creada
            </DialogTitle>
            <DialogDescription>
              Entrega estas credenciales al usuario. La contraseña temporal solo se muestra ahora; pídele que la cambie en su
              perfil.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 rounded-xl bg-muted p-4 text-sm">
            <p>
              <span className="text-muted-foreground">Correo:</span> <strong>{credenciales?.correo}</strong>
            </p>
            <p>
              <span className="text-muted-foreground">Contraseña temporal:</span>{" "}
              <strong className="font-mono">{credenciales?.password}</strong>
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                if (credenciales) {
                  void navigator.clipboard?.writeText(`Correo: ${credenciales.correo}\nContraseña temporal: ${credenciales.password}`);
                  toast.success("Credenciales copiadas.");
                }
              }}
            >
              <Copy className="h-4 w-4" /> Copiar
            </Button>
            <Button onClick={() => setCredenciales(null)}>Listo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!aBorrar} onOpenChange={(o) => !o && setABorrar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar a {aBorrar ? fullName(aBorrar) : ""}?</AlertDialogTitle>
            <AlertDialogDescription>
              Se borrará su cuenta y sus registros (asistencias, sesiones, evidencias). Esta acción no se puede deshacer. Si solo
              quieres impedir su acceso, usa «Desactivar».
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={borrar}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

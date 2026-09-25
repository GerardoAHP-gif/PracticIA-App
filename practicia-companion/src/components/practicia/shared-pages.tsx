import { useEffect, useState } from "react";
import { Bell, BookOpen, CalendarClock, CheckCircle2, FileCheck2, Info, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState, PageHeader, StatusBadge } from "./ui-bits";
import { fullName, initials, notifications, useDataVersion, type Person, type Role } from "@/lib/data";
import { actualizarMiPerfil, cambiarMiContrasena, marcarNotificacionLeida, marcarTodasLeidas } from "@/lib/actions";
import { roleLabel } from "@/lib/session";

const tipoIcon = {
  asistencia: CheckCircle2,
  sesion: BookOpen,
  recordatorio: CalendarClock,
  revision: FileCheck2,
  sistema: Info,
} as const;

export function NotificationsPage({ role }: { role: Role }) {
  useDataVersion();
  const items = notifications.filter((n) => n.para === role);
  const sinLeer = items.filter((n) => !n.leida).length;

  const marcarTodo = async () => {
    try {
      await marcarTodasLeidas();
      toast.success("Todas las notificaciones fueron marcadas como leídas.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  };
  const marcarUna = async (id: string, leida: boolean) => {
    if (leida) return;
    try {
      await marcarNotificacionLeida(id);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    }
  };
  return (
    <div>
      <PageHeader
        title="Notificaciones"
        description="Avisos sobre prácticas, sesiones, asistencias y revisiones."
        action={
          <Button
            variant="outline"
            className="h-10"
            disabled={sinLeer === 0}
            onClick={marcarTodo}
          >
            Marcar todo como leído
          </Button>
        }
      />
      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Sin notificaciones"
          description="Cuando ocurra algo relevante en tus prácticas, lo verás aquí."
        />
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = tipoIcon[n.tipo];
            return (
              <article
                key={n.id}
                onClick={() => marcarUna(n.id, n.leida)}
                className={`surface-card flex cursor-pointer items-start gap-3 p-4 ${!n.leida ? "border-primary/30" : ""}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold">{n.titulo}</p>
                  <p className="text-xs text-muted-foreground">{n.detalle}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-[11px] whitespace-nowrap text-muted-foreground">
                    {n.tiempo}
                  </span>
                  {!n.leida && <span className="h-2 w-2 rounded-full bg-primary" />}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ProfilePage({ role, user }: { role: Role; user: Person }) {
  const [nombres, setNombres] = useState(user.nombres);
  const [apellidos, setApellidos] = useState(user.apellidos);
  const [telefono, setTelefono] = useState(user.telefono ?? "");
  const [guardando, setGuardando] = useState(false);

  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [cambiando, setCambiando] = useState(false);
  const [permiso, setPermiso] = useState<string>("desconocido");

  // Cuando termina de cargar el usuario real, rellena el formulario.
  useEffect(() => {
    setNombres(user.nombres);
    setApellidos(user.apellidos);
    setTelefono(user.telefono ?? "");
  }, [user.id, user.nombres, user.apellidos, user.telefono]);

  useEffect(() => {
    if (typeof navigator !== "undefined" && navigator.permissions) {
      navigator.permissions
        .query({ name: "geolocation" as PermissionName })
        .then((r) => setPermiso(r.state))
        .catch(() => undefined);
    }
  }, []);

  const guardar = async () => {
    setGuardando(true);
    try {
      await actualizarMiPerfil({ nombres, apellidos, telefono });
      toast.success("Cambios guardados.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudieron guardar los cambios.");
    } finally {
      setGuardando(false);
    }
  };

  const cambiarPass = async () => {
    if (pass !== pass2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setCambiando(true);
    try {
      await cambiarMiContrasena(pass);
      setPass("");
      setPass2("");
      toast.success("Contraseña actualizada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo cambiar la contraseña.");
    } finally {
      setCambiando(false);
    }
  };

  const permisoTxt: Record<string, string> = {
    granted: "Permitido",
    denied: "Bloqueado: actívalo en los ajustes del navegador",
    prompt: "Se te pedirá al registrar asistencia",
    desconocido: "Se te pedirá al registrar asistencia",
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Perfil" description="Tu información institucional y seguridad de la cuenta." />

      <div className="surface-card flex items-center gap-4 p-5">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-lg font-extrabold text-primary-foreground">
          {initials(user)}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold">{fullName(user)}</p>
          <p className="truncate text-sm text-muted-foreground">{user.correo}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <StatusBadge status={roleLabel[role]} tone="primary" />
            <StatusBadge status={user.estado} />
          </div>
        </div>
      </div>

      <div className="surface-card mt-4 space-y-4 p-5">
        <p className="text-sm font-bold">Datos personales</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="nombres">Nombres</Label>
            <Input id="nombres" value={nombres} onChange={(e) => setNombres(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="apellidos">Apellidos</Label>
            <Input id="apellidos" value={apellidos} onChange={(e) => setApellidos(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="correo">Correo institucional</Label>
            <Input id="correo" value={user.correo} readOnly />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="telefono">Teléfono</Label>
            <Input id="telefono" type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="999 999 999" />
          </div>
          {user.programa && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="programa">Programa</Label>
              <Input id="programa" value={`${user.programa}${user.ciclo ? ` · Ciclo ${user.ciclo}` : ""}`} readOnly />
            </div>
          )}
        </div>
        <Button onClick={guardar} disabled={guardando}>
          {guardando && <Loader2 className="h-4 w-4 animate-spin" />} Guardar cambios
        </Button>
      </div>

      <div className="surface-card mt-4 space-y-4 p-5">
        <p className="text-sm font-bold">Cambiar contraseña</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="pass1">Nueva contraseña</Label>
            <Input id="pass1" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="pass2">Repite la contraseña</Label>
            <Input id="pass2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
          </div>
        </div>
        <Button variant="outline" onClick={cambiarPass} disabled={cambiando || pass.length === 0}>
          {cambiando && <Loader2 className="h-4 w-4 animate-spin" />} Actualizar contraseña
        </Button>
      </div>

      {role === "estudiante" && (
        <div className="surface-card mt-4 space-y-2 p-5">
          <p className="text-sm font-bold">Permisos del dispositivo</p>
          <p className="text-xs text-muted-foreground">
            Ubicación (para validar tu llegada): <span className="font-semibold text-foreground">{permisoTxt[permiso] ?? permisoTxt["desconocido"]}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            La cámara se solicita al momento de tomar la evidencia fotográfica.
          </p>
        </div>
      )}
    </div>
  );
}

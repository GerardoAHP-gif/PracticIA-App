import { useCallback, useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Camera,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  Building2,
  ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { attendance, fmtDate, getInstitution, practicesOf, todayISO } from "@/lib/data";
import {
  evaluarUbicacion,
  obtenerUbicacion,
  registrarAsistencia,
  type AsistenciaRechazada,
  type Ubicacion,
} from "@/lib/actions";

export const Route = createFileRoute("/estudiante/registrar-asistencia")({
  head: () => ({
    meta: [
      { title: "Registrar asistencia — PracticIA" },
      {
        name: "description",
        content:
          "Valida tu ubicación, toma tu evidencia fotográfica y confirma tu asistencia a la práctica profesional.",
      },
      { property: "og:title", content: "Registrar asistencia — PracticIA" },
      { property: "og:description", content: "Ubicación válida, evidencia y confirmación." },
    ],
  }),
  component: AttendanceFlow,
});

function AttendanceFlow() {
  const user = useCurrentUser("estudiante");
  const hoy = todayISO();
  const mias = practicesOf(user.id).filter((p) => p.estado !== "Finalizada");
  const practica = mias.find((p) => p.fecha === hoy);
  const proxima = mias.filter((p) => p.fecha > hoy).sort((a, b) => a.fecha.localeCompare(b.fecha))[0];
  const institucion = getInstitution(practica?.institucionId);
  const yaRegistro = !!practica && attendance.some((a) => a.practicaId === practica.id && a.estudianteId === user.id);

  const [step, setStep] = useState(1);
  const [verificando, setVerificando] = useState(true);
  const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
  const [errorGps, setErrorGps] = useState<string | null>(null);
  const [foto, setFoto] = useState<File | null>(null);
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState<AsistenciaRechazada | null>(null);
  const [resultado, setResultado] = useState<null | {
    puntualidad: "Temprano" | "Puntual" | "Tarde";
    distancia: number | null;
    fecha: string;
    hora: string;
  }>(null);
  const camaraRef = useRef<HTMLInputElement>(null);

  const verificar = useCallback(async () => {
    setVerificando(true);
    setErrorGps(null);
    try {
      setUbicacion(await obtenerUbicacion());
    } catch (e) {
      setUbicacion(null);
      setErrorGps(e instanceof Error ? e.message : "No se pudo obtener tu ubicación.");
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    if (step === 1 && practica && !yaRegistro && !resultado) void verificar();
  }, [step, practica?.id, yaRegistro, resultado, verificar]);

  useEffect(() => {
    if (!foto) {
      setFotoUrl(null);
      return undefined;
    }
    const url = URL.createObjectURL(foto);
    setFotoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  // Esta comparación es solo para MOSTRAR la distancia en pantalla mientras el estudiante
  // se acerca. La que de verdad decide si se guarda o se rechaza el registro se vuelve a
  // calcular en el servidor (función registrar_asistencia en Supabase) — ver <lib/actions.ts>.
  const evalu = evaluarUbicacion(ubicacion, institucion);
  // Solo se puede avanzar del paso 1 con una ubicación real y, si la institución tiene
  // coordenadas cargadas, dentro del radio permitido. No hay forma de "saltarse" el GPS.
  const puedeAvanzar = !verificando && !errorGps && ubicacion !== null && evalu.dentro === true;

  const confirmar = async () => {
    if (!foto || !ubicacion || !practica) return;
    setEnviando(true);
    setErrorEnvio(null);
    try {
      setResultado(
        await registrarAsistencia({
          practicaId: practica.id,
          ...(institucion ? { institucion } : {}),
          ubicacion,
          foto,
        }),
      );
    } catch (e) {
      const rechazo = e as Partial<AsistenciaRechazada> & Error;
      setErrorEnvio({ motivo: rechazo.motivo ?? "OTRO", mensaje: rechazo.message });
      toast.error(rechazo.message);
      // Si el servidor rechazó por GPS, hay que volver a verificar la ubicación desde cero.
      if (rechazo.motivo === "GPS_REQUERIDO" || rechazo.motivo === "FUERA_DE_RANGO") {
        setStep(1);
        void verificar();
      }
    } finally {
      setEnviando(false);
    }
  };

  if (!practica || yaRegistro) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
          {yaRegistro ? <CheckCircle2 className="h-8 w-8" /> : <Clock className="h-8 w-8" />}
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">
          {yaRegistro ? "Ya registraste tu asistencia hoy" : "No tienes práctica programada para hoy"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {yaRegistro
            ? "Tu docente ya fue notificada."
            : proxima
              ? `Tu próxima práctica es el ${fmtDate(proxima.fecha)} a las ${proxima.hora}.`
              : "Cuando el administrador programe una práctica, podrás registrar tu llegada desde aquí."}
        </p>
        <div className="mt-6 grid gap-2">
          <Button asChild className="h-11">
            <Link to="/estudiante/asistencia">Ver mi historial de asistencia</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/estudiante">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  if (resultado) {
    return (
      <div className="mx-auto max-w-md py-10 text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-success/12 text-success">
          <CheckCircle2 className="h-8 w-8" />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">¡Asistencia registrada!</h1>
        <p className="mt-2 text-sm text-muted-foreground">Tu ubicación fue validada por el servidor. Tu docente ha sido notificada.</p>
        <div className="surface-card mt-6 space-y-2 p-4 text-left text-sm">
          <Row label="Fecha" value={resultado.fecha} />
          <Row label="Hora" value={resultado.hora} />
          <Row label="Institución" value={institucion?.nombre ?? "—"} />
          <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
            <span className="text-muted-foreground">Puntualidad</span>
            <StatusBadge status={resultado.puntualidad} />
          </div>
          {resultado.distancia != null && <Row label="Distancia" value={`${resultado.distancia} m`} />}
        </div>
        <div className="mt-6 grid gap-2">
          <Button asChild className="h-11">
            <Link to="/estudiante/asistencia">Ver mi historial de asistencia</Link>
          </Button>
          <Button asChild variant="outline" className="h-11">
            <Link to="/estudiante">Volver al inicio</Link>
          </Button>
        </div>
      </div>
    );
  }

  const ubicacionTxt = institucion ? [institucion.direccion, institucion.distrito].filter(Boolean).join(", ") : "—";
  const ahora = new Date();
  const horaAhora = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader title="Registrar asistencia" description={`${institucion?.nombre ?? "Institución por confirmar"} · ${practica.hora}`} />

      <ol className="mb-5 flex items-center gap-2">
        {[1, 2, 3].map((n) => (
          <li key={n} className="flex flex-1 items-center gap-2">
            <span
              className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                step >= n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {n}
            </span>
            {n < 3 && <span className={`h-0.5 flex-1 rounded ${step > n ? "bg-primary" : "bg-border"}`} />}
          </li>
        ))}
      </ol>

      {errorEnvio && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorEnvio.mensaje}</AlertDescription>
        </Alert>
      )}

      {step === 1 && (
        <div className="surface-card p-5 text-center">
          <span
            className={`mx-auto flex h-14 w-14 items-center justify-center rounded-2xl ${
              verificando ? "bg-primary/10 text-primary" : puedeAvanzar ? "bg-primary/10 text-primary" : "bg-destructive/10 text-destructive"
            }`}
          >
            {verificando ? (
              <Loader2 className="h-6 w-6 animate-spin" />
            ) : puedeAvanzar ? (
              <ShieldCheck className="h-6 w-6" />
            ) : (
              <ShieldAlert className="h-6 w-6" />
            )}
          </span>
          <p className="mt-4 font-bold">
            {verificando
              ? "Estamos verificando tu ubicación..."
              : errorGps
                ? "No pudimos obtener tu ubicación"
                : evalu.dentro === true
                  ? "Ubicación válida"
                  : evalu.dentro === false
                    ? "Estás fuera del radio permitido"
                    : "Ubicación obtenida"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {verificando
              ? "Comparando tu posición con las coordenadas de la institución."
              : errorGps
                ? errorGps
                : evalu.distancia != null && institucion
                  ? evalu.dentro
                    ? `Estás a ${evalu.distancia} m de ${institucion.nombre}. Dentro del rango permitido.`
                    : `Estás a ${evalu.distancia} m de ${institucion.nombre} (máximo ${institucion.radio} m). No puedes registrar tu asistencia desde aquí: acércate e inténtalo de nuevo.`
                  : "La institución aún no tiene coordenadas registradas: pide al administrador que las cargue antes de continuar."}
          </p>
          <div className="mt-5 grid gap-2">
            <Button variant="outline" className="h-11" disabled={verificando} onClick={verificar}>
              {verificando ? <Loader2 className="h-4 w-4 animate-spin" /> : "Actualizar mi ubicación"}
            </Button>
            <Button className="h-11" disabled={!puedeAvanzar} onClick={() => setStep(2)}>
              Continuar
            </Button>
          </div>
          {!puedeAvanzar && !verificando && (
            <p className="mt-3 text-[11px] text-muted-foreground">
              Sin una ubicación válida dentro del rango de la institución, el sistema no permite continuar.
            </p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="surface-card p-5">
          <p className="font-bold">Evidencia fotográfica</p>
          <p className="mt-1 text-sm text-muted-foreground">Toma una fotografía que muestre tu llegada a la institución.</p>
          <input
            ref={camaraRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              if (f && f.size > 10 * 1024 * 1024) {
                toast.error("La foto supera los 10 MB.");
                return;
              }
              setFoto(f);
            }}
          />
          <div className="mt-4 flex h-52 items-center justify-center overflow-hidden rounded-xl border border-dashed border-border bg-muted">
            {fotoUrl ? (
              <img src={fotoUrl} alt="Evidencia de llegada" className="h-full w-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Camera className="h-8 w-8" />
                <p className="text-sm">Aún no has tomado la fotografía</p>
              </div>
            )}
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button variant={foto ? "outline" : "default"} className="h-11" onClick={() => camaraRef.current?.click()}>
              <Camera className="h-4 w-4" /> {foto ? "Volver a tomar" : "Tomar evidencia"}
            </Button>
            <Button className="h-11" disabled={!foto} onClick={() => setStep(3)}>
              Continuar
            </Button>
          </div>
          {!foto && (
            <Alert className="mt-4">
              <AlertDescription>
                Necesitamos permiso para usar tu cámara y guardar la evidencia de llegada.
              </AlertDescription>
            </Alert>
          )}
        </div>
      )}

      {step === 3 && (
        <div className="surface-card p-5">
          <p className="font-bold">Confirma tu asistencia</p>
          <div className="mt-4 space-y-2 text-sm">
            <Row label="Fecha" value={fmtDate(ahora)} icon={Clock} />
            <Row label="Hora" value={horaAhora} icon={Clock} />
            <Row label="Institución" value={institucion?.nombre ?? "—"} icon={Building2} />
            <Row label="Ubicación" value={ubicacionTxt} icon={MapPin} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-xl bg-muted p-3">
            {fotoUrl ? (
              <img src={fotoUrl} alt="" className="h-14 w-14 rounded-lg object-cover" />
            ) : (
              <span className="flex h-14 w-14 items-center justify-center rounded-lg bg-card text-muted-foreground">
                <ImageIcon className="h-6 w-6" />
              </span>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{foto?.name ?? "evidencia"}</p>
              <p className="text-xs text-muted-foreground">
                Fotografía de llegada{foto ? ` · ${(foto.size / 1024 / 1024).toFixed(1)} MB` : ""}
              </p>
            </div>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            Al confirmar, el servidor vuelve a comprobar tu ubicación antes de guardar el registro.
          </p>
          <Button className="mt-3 h-11 w-full" disabled={enviando || !foto || !ubicacion} onClick={confirmar}>
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />}
            {enviando ? "Validando y registrando..." : "Confirmar asistencia"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border pb-2 last:border-0 last:pb-0">
      <span className="flex items-center gap-2 text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {label}
      </span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  );
}

import { useState } from "react";
import { toast } from "sonner";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Loader2, MapPin, Navigation, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { googleMapsUrl, RealMap } from "@/components/practicia/real-map";
import { useCurrentUser } from "@/lib/session";
import { fmtDate, getInstitution, practicesOf, todayISO } from "@/lib/data";
import { evaluarUbicacion, marcarEnCamino, obtenerUbicacion } from "@/lib/actions";

export const Route = createFileRoute("/estudiante/mi-practica")({
  head: () => ({
    meta: [
      { title: "Ir a mi práctica — PracticIA" },
      {
        name: "description",
        content:
          "Navega hacia la institución educativa de tu práctica y prepárate para registrar tu llegada.",
      },
      { property: "og:title", content: "Ir a mi práctica — PracticIA" },
      { property: "og:description", content: "Ruta hacia tu institución y registro de llegada." },
    ],
  }),
  component: RoutePage,
});

function RoutePage() {
  const user = useCurrentUser("estudiante");
  const hoy = todayISO();
  const pendientes = practicesOf(user.id)
    .filter((p) => p.estado !== "Finalizada")
    .sort((a, b) => a.fecha.localeCompare(b.fecha));
  const practica = pendientes.find((p) => p.fecha >= hoy) ?? pendientes[0];
  const institucion = getInstitution(practica?.institucionId);

  const [distancia, setDistancia] = useState<number | null>(null);
  const [errorGps, setErrorGps] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  if (!practica) {
    return (
      <div>
        <PageHeader title="Ir a mi práctica" description="Navegación hacia tu institución." />
        <EmptyState
          icon={MapPin}
          title="No tienes una práctica pendiente"
          description="Cuando el administrador programe tu práctica, aquí verás la ruta hacia tu institución."
        />
      </div>
    );
  }

  const tieneCoords = !!institucion && (institucion.latitud !== 0 || institucion.longitud !== 0);
  const enCamino = practica.estado === "En camino";
  const llego = practica.estado === "Llegada registrada";
  const esHoy = practica.fecha === hoy;

  const calcularDistancia = async () => {
    setCargando(true);
    setErrorGps(null);
    try {
      const u = await obtenerUbicacion();
      setDistancia(evaluarUbicacion(u, institucion).distancia);
    } catch (e) {
      setErrorGps(e instanceof Error ? e.message : "No se pudo obtener tu ubicación.");
    } finally {
      setCargando(false);
    }
  };

  const iniciarRuta = async () => {
    setCargando(true);
    try {
      await marcarEnCamino(practica.id);
      if (tieneCoords && institucion) window.open(googleMapsUrl(institucion.latitud, institucion.longitud), "_blank", "noopener,noreferrer");
      void calcularDistancia();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo iniciar la ruta.");
      setCargando(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Ir a mi práctica"
        description="Navegación hacia tu institución. PracticIA no realiza seguimiento permanente."
      />

      {errorGps && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{errorGps}</AlertDescription>
        </Alert>
      )}

      <RealMap {...(institucion ? { lat: institucion.latitud, lng: institucion.longitud } : {})} />

      <div className="surface-card mt-4 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">Tu destino</p>
            <p className="mt-1 font-bold">{institucion?.nombre ?? "Institución por confirmar"}</p>
            <p className="text-xs text-muted-foreground">
              {[institucion?.direccion, institucion?.distrito].filter(Boolean).join(" · ") || "—"}
            </p>
          </div>
          <StatusBadge status={practica.estado} />
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3 text-center">
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Distancia</p>
            <p className="text-sm font-bold">
              {distancia == null ? "—" : distancia >= 1000 ? `${(distancia / 1000).toFixed(1)} km` : `${distancia} m`}
            </p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Fecha</p>
            <p className="text-sm font-bold">{esHoy ? "Hoy" : fmtDate(practica.fecha)}</p>
          </div>
          <div className="rounded-lg bg-muted p-3">
            <p className="text-[11px] text-muted-foreground">Hora de práctica</p>
            <p className="text-sm font-bold">{practica.hora}</p>
          </div>
        </div>

        <p className="mt-4 text-sm text-muted-foreground">
          {llego ? "Ya registraste tu llegada hoy." : "Cuando llegues, podrás registrar tu asistencia."}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {!llego && (
            <Button className="h-11" disabled={cargando || !esHoy || enCamino} onClick={iniciarRuta}>
              {cargando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Navigation className="h-4 w-4" />}
              {enCamino ? "Ya vas en camino" : "Iniciar ruta"}
            </Button>
          )}
          <Button variant="outline" className="h-11" disabled={cargando} onClick={calcularDistancia}>
            <MapPin className="h-4 w-4" /> Ver mi distancia
          </Button>
          {esHoy && !llego && (
            <Button asChild variant={enCamino ? "default" : "secondary"} className="h-11 sm:col-span-2">
              <Link to="/estudiante/registrar-asistencia">
                <MapPin className="h-4 w-4" /> Registrar asistencia
              </Link>
            </Button>
          )}
        </div>
        {!esHoy && (
          <p className="mt-3 text-xs text-muted-foreground">
            La ruta y el registro de asistencia se habilitan el día de tu práctica ({fmtDate(practica.fecha)}).
          </p>
        )}
      </div>

      <div className="surface-card mt-4 flex items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-3">
          <span className="gradient-ia flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-xs font-bold">¿Dudas sobre tu llegada o sesión?</p>
            <p className="text-xs text-muted-foreground">Consulta al Asistente IA para revisar tus horarios o itinerario.</p>
          </div>
        </div>
        <Button asChild variant="secondary" size="sm" className="shrink-0">
          <Link to="/estudiante/asistente">Consultar IA</Link>
        </Button>
      </div>

      <div className="surface-card mt-4 flex items-center gap-3 px-4 py-3">
        <Clock className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">Tu docente verá tu estado de llegada, no tu ubicación en tiempo real.</p>
      </div>
    </div>
  );
}

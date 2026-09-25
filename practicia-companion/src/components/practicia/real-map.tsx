import { MapPin } from "lucide-react";

/**
 * Mapa real de OpenStreetMap (sin claves ni cuentas). Muestra un marcador en (lat, lng).
 * Si la institución aún no tiene coordenadas, muestra un aviso.
 */
export function RealMap({
  lat,
  lng,
  className = "h-[340px] md:h-[420px]",
  radioGrados = 0.006,
}: {
  lat?: number;
  lng?: number;
  className?: string;
  radioGrados?: number;
}) {
  const valido = typeof lat === "number" && typeof lng === "number" && (lat !== 0 || lng !== 0);
  if (!valido) {
    return (
      <div className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted text-sm text-muted-foreground ${className}`}>
        <MapPin className="h-6 w-6" />
        La institución aún no tiene coordenadas registradas.
      </div>
    );
  }
  const bbox = [lng - radioGrados, lat - radioGrados, lng + radioGrados, lat + radioGrados].join(",");
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${lat}%2C${lng}`;
  return (
    <iframe
      title="Mapa de la institución"
      src={src}
      loading="lazy"
      className={`w-full rounded-xl border border-border ${className}`}
    />
  );
}

export const googleMapsUrl = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

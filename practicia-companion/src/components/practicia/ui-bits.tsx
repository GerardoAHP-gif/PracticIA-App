import type { ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "success" | "warning" | "info" | "danger" | "ia" | "primary";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-muted text-muted-foreground border-transparent",
  success: "bg-success/12 text-success border-success/25",
  warning: "bg-warning/20 text-warning-foreground border-warning/40",
  info: "bg-info/12 text-info border-info/25",
  danger: "bg-destructive/12 text-destructive border-destructive/25",
  ia: "bg-ia/12 text-ia border-ia/25",
  primary: "bg-primary/10 text-primary border-primary/20",
};

const statusTone: Record<string, Tone> = {
  Pendiente: "neutral",
  "En preparación": "info",
  Aprobada: "success",
  Aprobado: "success",
  "En camino": "warning",
  "Llegada registrada": "success",
  Finalizada: "primary",
  Confirmada: "success",
  Observada: "danger",
  Validada: "success",
  Enviado: "info",
  Revisado: "success",
  "Requiere modificación": "danger",
  "Requiere modificaciones": "danger",
  "Pendiente de revisión IA": "neutral",
  "IA analizando": "ia",
  "Recomendaciones disponibles": "ia",
  "Enviada a docente": "info",
  Llegó: "success",
  Incidencia: "danger",
  Activo: "success",
  Activa: "success",
  Inactivo: "neutral",
  Inactiva: "neutral",
  Completada: "success",
  Completado: "success",
  Temprano: "info",
  Puntual: "success",
  Tarde: "warning",
  Falta: "danger",
};

export function StatusBadge({
  status,
  tone,
  className,
}: {
  status: string;
  tone?: Tone;
  className?: string;
}) {
  const t = tone ?? statusTone[status] ?? "neutral";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap",
        toneClasses[t],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight md:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-bold tracking-wide text-muted-foreground uppercase">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "primary",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: Tone;
}) {
  return (
    <div className="surface-card p-4">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg border",
              toneClasses[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl font-extrabold tracking-tight">{value}</p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="surface-card flex flex-col items-center gap-2 px-6 py-12 text-center">
      <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </span>
      <p className="font-semibold">{title}</p>
      <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

export function LoadingState({ label = "Cargando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 px-6 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" />
      {label}
    </div>
  );
}

export function Timeline({
  items,
}: {
  items: { title: string; detail: string; time: string; done?: boolean }[];
}) {
  return (
    <ol className="relative space-y-5 border-l border-border pl-6">
      {items.map((item, i) => (
        <li key={i} className="relative">
          <span
            className={cn(
              "absolute top-1 -left-[27px] h-3.5 w-3.5 rounded-full border-2 border-background",
              item.done ? "bg-success" : "bg-border",
            )}
          />
          <p className="text-sm font-semibold">{item.title}</p>
          <p className="text-xs text-muted-foreground">{item.detail}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">{item.time}</p>
        </li>
      ))}
    </ol>
  );
}

/** Mapa simulado, listo para reemplazar por un proveedor real (Mapbox / Google Maps). */
export function MapContainer({
  className,
  markers = [],
  route = false,
  children,
}: {
  className?: string;
  markers?: { top: string; left: string; tone: Tone; label?: string }[];
  route?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "map-grid relative w-full overflow-hidden rounded-xl border border-border",
        className,
      )}
      role="img"
      aria-label="Mapa de referencia"
    >
      {route && (
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 400 300" fill="none">
          <path
            d="M70 240 C 140 220, 150 150, 210 130 S 300 95, 330 70"
            stroke="oklch(0.46 0.16 259)"
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray="14 10"
          />
        </svg>
      )}
      {markers.map((m, i) => (
        <span
          key={i}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ top: m.top, left: m.left }}
        >
          <span
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow-card",
              m.tone === "success" && "bg-success",
              m.tone === "warning" && "bg-warning",
              m.tone === "danger" && "bg-destructive",
              m.tone === "neutral" && "bg-muted-foreground",
              m.tone === "primary" && "bg-primary",
              m.tone === "info" && "bg-info",
              m.tone === "ia" && "bg-ia",
            )}
          >
            <span className="h-2 w-2 rounded-full bg-background/90" />
          </span>
          {m.label && (
            <span className="absolute top-7 left-1/2 -translate-x-1/2 rounded-md bg-card px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shadow-card">
              {m.label}
            </span>
          )}
        </span>
      ))}
      {children}
    </div>
  );
}

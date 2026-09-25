import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Database, HardDrive, Loader2, RefreshCw, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader, SectionTitle } from "@/components/practicia/ui-bits";
import { API_URL } from "@/services/api";
import { supabase, BUCKET } from "@/lib/supabase";
import { institutions, people, useDataVersion } from "@/lib/data";
import { MAX_FILE_MB } from "@/lib/actions";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/admin/configuracion")({
  head: () => ({
    meta: [
      { title: "Configuración — PracticIA" },
      {
        name: "description",
        content: "Estado real de los servicios conectados: base de datos, backend, IA y almacenamiento.",
      },
    ],
  }),
  component: SettingsPage,
});

type Estado = "cargando" | "ok" | "error";
interface Health {
  ok: boolean;
  ia?: { gemini: boolean; groq: boolean; openrouter: boolean };
  supabase?: boolean;
}

function Pill({ estado, texto }: { estado: Estado; texto?: string | undefined }) {
  const cls =
    estado === "ok"
      ? "bg-emerald-500/10 text-emerald-600"
      : estado === "error"
        ? "bg-destructive/10 text-destructive"
        : "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${cls}`}>
      {estado === "cargando" && <Loader2 className="h-3 w-3 animate-spin" />}
      {texto ?? (estado === "ok" ? "Conectado" : estado === "error" ? "Sin conexión" : "Verificando…")}
    </span>
  );
}

function Fila({ icon: Icon, nombre, detalle, estado, texto }: { icon: React.ComponentType<{ className?: string }>; nombre: string; detalle: string; estado: Estado; texto?: string | undefined }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border p-3">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{nombre}</p>
        <p className="truncate text-xs text-muted-foreground">{detalle}</p>
      </div>
      <Pill estado={estado} texto={texto} />
    </div>
  );
}

function SettingsPage() {
  useCurrentUser("admin");
  useDataVersion();
  const [db, setDb] = useState<Estado>("cargando");
  const [storage, setStorage] = useState<Estado>("cargando");
  const [backend, setBackend] = useState<Estado>("cargando");
  const [health, setHealth] = useState<Health | null>(null);

  const verificar = useCallback(async () => {
    setDb("cargando");
    setStorage("cargando");
    setBackend("cargando");
    supabase
      .from("perfiles")
      .select("id", { count: "exact", head: true })
      .then((r) => setDb(r.error ? "error" : "ok"));
    supabase.storage
      .from(BUCKET)
      .list("", { limit: 1 })
      .then((r) => setStorage(r.error ? "error" : "ok"));
    try {
      const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(70_000) });
      const j = (await res.json()) as Health;
      setHealth(j);
      setBackend(res.ok && j.ok ? "ok" : "error");
    } catch {
      setBackend("error");
    }
  }, []);

  useEffect(() => {
    void verificar();
  }, [verificar]);

  const iaActivos = health?.ia ? Object.entries(health.ia).filter(([, v]) => v).map(([k]) => k) : [];

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Configuración"
        description="Estado real de los servicios conectados a PracticIA."
        action={
          <Button variant="outline" className="h-10" onClick={verificar}>
            <RefreshCw className="h-4 w-4" /> Verificar
          </Button>
        }
      />

      <section className="surface-card mb-4 p-5">
        <SectionTitle>Servicios</SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          <Fila icon={Database} nombre="Base de datos" detalle="Supabase (Postgres + Auth)" estado={db} />
          <Fila icon={HardDrive} nombre="Almacenamiento" detalle={`Bucket privado «${BUCKET}»`} estado={storage} />
          <Fila icon={Server} nombre="Backend" detalle={API_URL.replace(/^https?:\/\//, "")} estado={backend} />
          <Fila
            icon={Cpu}
            nombre="Servicio de IA (cascada)"
            detalle={iaActivos.length ? `Activos: ${iaActivos.join(" → ")}` : "Gemini → Groq → OpenRouter"}
            estado={backend === "ok" ? (iaActivos.length ? "ok" : "error") : backend}
            texto={backend === "ok" && iaActivos.length === 0 ? "Sin claves de IA" : undefined}
          />
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          El backend gratuito de Render se duerme tras unos minutos sin uso: la primera verificación puede tardar hasta un minuto.
        </p>
      </section>

      <section className="surface-card p-5">
        <SectionTitle>Parámetros vigentes</SectionTitle>
        <dl className="divide-y divide-border text-sm">
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Tamaño máximo por archivo</dt>
            <dd className="font-semibold">{MAX_FILE_MB} MB</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Radio de validación de llegada</dt>
            <dd className="font-semibold">Se define en cada institución (por defecto 100 m)</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Usuarios registrados</dt>
            <dd className="font-semibold">{people.length}</dd>
          </div>
          <div className="flex justify-between py-2">
            <dt className="text-muted-foreground">Instituciones registradas</dt>
            <dd className="font-semibold">{institutions.length}</dd>
          </div>
        </dl>
      </section>
    </div>
  );
}

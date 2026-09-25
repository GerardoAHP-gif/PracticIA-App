import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, ChevronLeft, ChevronRight, Clock, MapPin } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { fmtDate, getInstitution, practicesOf, todayISO, type Practice } from "@/lib/data";

export const Route = createFileRoute("/estudiante/calendario")({
  head: () => ({
    meta: [
      { title: "Calendario de prácticas — PracticIA" },
      {
        name: "description",
        content:
          "Consulta tu calendario mensual de prácticas profesionales con institución, hora, sesión y estado.",
      },
      { property: "og:title", content: "Calendario de prácticas — PracticIA" },
      { property: "og:description", content: "Tu mes de prácticas, en una sola vista." },
    ],
  }),
  component: CalendarPage,
});

const diasSemana = ["L", "M", "M", "J", "V", "S", "D"];

const MESES_LARGO = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

function CalendarPage() {
  const user = useCurrentUser("estudiante");
  const misPracticas = practicesOf(user.id);
  const hoy = todayISO();

  const [mes, setMes] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [selected, setSelected] = useState<string | null>(hoy);

  const diasEnMes = new Date(mes.y, mes.m + 1, 0).getDate();
  // Semana que inicia en lunes: getDay() 0=domingo → 6, 1=lunes → 0
  const offset = (new Date(mes.y, mes.m, 1).getDay() + 6) % 7;
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1);
  const fechaDe = (dia: number) => `${mes.y}-${String(mes.m + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
  const practicaDe = (dia: number) => misPracticas.find((p) => p.fecha === fechaDe(dia));
  const detalle = misPracticas.find((p) => p.fecha === selected);
  const proximas = misPracticas.filter((p) => p.fecha >= hoy).sort((a, b) => a.fecha.localeCompare(b.fecha));

  const moverMes = (delta: number) =>
    setMes(({ y, m }) => {
      const d = new Date(y, m + delta, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });

  return (
    <div>
      <PageHeader title="Calendario" description="Tus prácticas programadas y su estado de avance." />

      <Tabs defaultValue="mes">
        <TabsList className="mb-4">
          <TabsTrigger value="mes">Vista mensual</TabsTrigger>
          <TabsTrigger value="proximas">Próximas prácticas</TabsTrigger>
        </TabsList>

        <TabsContent value="mes">
          <div className="surface-card p-4">
            <div className="mb-4 flex items-center justify-between">
              <button
                type="button"
                onClick={() => moverMes(-1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
                aria-label="Mes anterior"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-sm font-bold">
                {MESES_LARGO[mes.m]} {mes.y}
              </p>
              <button
                type="button"
                onClick={() => moverMes(1)}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground"
                aria-label="Mes siguiente"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center">
              {diasSemana.map((d, i) => (
                <span key={i} className="pb-1 text-[11px] font-bold text-muted-foreground">
                  {d}
                </span>
              ))}
              {Array.from({ length: offset }).map((_, i) => (
                <span key={`e-${i}`} />
              ))}
              {dias.map((d) => {
                const p = practicaDe(d);
                const fecha = fechaDe(d);
                const act = selected === fecha;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSelected(fecha)}
                    className={`relative flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors ${
                      act
                        ? "bg-primary font-bold text-primary-foreground"
                        : p
                          ? "bg-accent font-semibold text-accent-foreground"
                          : fecha === hoy
                            ? "border border-primary/40 font-semibold"
                            : "hover:bg-muted"
                    }`}
                  >
                    {d}
                    {p && <span className={`mt-0.5 h-1.5 w-1.5 rounded-full ${act ? "bg-primary-foreground" : "bg-primary"}`} />}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4">
            {detalle ? (
              <PracticeRow p={detalle} />
            ) : (
              <p className="px-1 text-sm text-muted-foreground">
                {selected ? `No tienes práctica el ${fmtDate(selected)}.` : "Selecciona un día para ver el detalle."}
              </p>
            )}
          </div>
        </TabsContent>

        <TabsContent value="proximas">
          {proximas.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="Sin prácticas próximas"
              description="Cuando el administrador programe nuevas prácticas, las verás aquí."
            />
          ) : (
            <div className="space-y-2">
              {proximas.map((p) => (
                <PracticeRow key={p.id} p={p} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function PracticeRow({ p }: { p: Practice }) {
  const institucion = getInstitution(p.institucionId);
  return (
    <article className="surface-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-bold">{institucion?.nombre ?? "Institución por confirmar"}</p>
          <p className="truncate text-xs text-muted-foreground">{p.sesion}</p>
        </div>
        <StatusBadge status={p.estado} />
      </div>
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <CalendarDays className="h-3.5 w-3.5" /> {fmtDate(p.fecha)}
        </span>
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> {p.hora}
        </span>
        <span className="flex items-center gap-1.5">
          <MapPin className="h-3.5 w-3.5" /> {institucion?.distrito || "—"}
        </span>
      </div>
    </article>
  );
}

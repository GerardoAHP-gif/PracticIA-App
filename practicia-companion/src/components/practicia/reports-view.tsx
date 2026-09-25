import { BarChart3, Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { exportToPdf } from "@/lib/export-pdf";
import { downloadXlsx } from "@/lib/xlsx-writer";
import {
  attendance,
  estadoAsistenciaPractica,
  evidences,
  fullName,
  getInstitution,
  getPerson,
  learningSessions,
  practices,
  todayISO,
  useDataVersion,
  type EstadoAsistenciaReporte,
  type Person,
} from "@/lib/data";

const pct = (a: number, b: number) => (b === 0 ? "—" : `${Math.round((a / b) * 100)}%`);

/** Reportes reales calculados con los datos que el rol actual puede ver. */
export function ReportsView({ title, description, estudiantes }: { title: string; description: string; estudiantes: Person[] }) {
  useDataVersion();
  const ids = new Set(estudiantes.map((e) => e.id));
  const asis = attendance.filter((a) => ids.has(a.estudianteId));
  const misPracticas = practices.filter((p) => ids.has(p.estudianteId));
  const sesiones = learningSessions.filter((s) => ids.has(s.estudianteId));
  const evid = evidences.filter((e) => ids.has(e.estudianteId));

  // Clasificación Temprano / Puntual / Tarde / Falta / Pendiente para cada práctica de estos estudiantes.
  const clasificacion = misPracticas.map((p) => ({ practica: p, estado: estadoAsistenciaPractica(p) }));
  const contar = (estado: EstadoAsistenciaReporte) => clasificacion.filter((c) => c.estado === estado).length;
  const temprano = contar("Temprano");
  const puntual = contar("Puntual");
  const tarde = contar("Tarde");
  const falta = contar("Falta");
  const registradas = temprano + puntual + tarde;
  const yaVencidas = registradas + falta; // prácticas cuyo plazo ya pasó (para calcular % sobre una base justa)

  const aprobadas = sesiones.filter((s) => s.estado === "Aprobada");
  const conNota = aprobadas.filter((s) => s.nota != null);
  const notaProm = conNota.length ? (conNota.reduce((t, s) => t + (s.nota ?? 0), 0) / conNota.length).toFixed(1) : "—";
  const validadas = evid.filter((e) => e.estado === "Validada").length;

  const metricas = [
    { titulo: "Puntualidad (temprano + puntual)", valor: pct(temprano + puntual, yaVencidas), detalle: `${temprano + puntual} de ${yaVencidas} prácticas vencidas` },
    { titulo: "Faltas", valor: pct(falta, yaVencidas), detalle: `${falta} de ${yaVencidas} prácticas vencidas` },
    { titulo: "Nota promedio de sesiones", valor: notaProm === "—" ? "—" : `${notaProm} / 20`, detalle: `${conNota.length} sesiones calificadas` },
    { titulo: "Evidencias validadas", valor: pct(validadas, evid.length), detalle: `${validadas} de ${evid.length} archivos` },
  ];

  const filas = estudiantes.map((e) => {
    const propias = clasificacion.filter((c) => c.practica.estudianteId === e.id);
    const s = sesiones.filter((x) => x.estudianteId === e.id && x.nota != null);
    const ev = evid.filter((x) => x.estudianteId === e.id);
    return {
      id: e.id,
      nombre: fullName(e),
      colegio: getInstitution(e.institucionId)?.nombre ?? "—",
      temprano: propias.filter((c) => c.estado === "Temprano").length,
      puntual: propias.filter((c) => c.estado === "Puntual").length,
      tarde: propias.filter((c) => c.estado === "Tarde").length,
      falta: propias.filter((c) => c.estado === "Falta").length,
      nota: s.length ? (s.reduce((t, x) => t + (x.nota ?? 0), 0) / s.length).toFixed(1) : "—",
      evidencias: ev.length,
    };
  });

  const fecha = todayISO();

  const exportarAsistencias = () => {
    downloadXlsx(`asistencias_${fecha}`, "Asistencias", [
      ["Estudiante", "Institución", "Fecha", "Hora programada", "Estado", "Distancia (m)"],
      ...clasificacion.map(({ practica: p, estado }) => {
        const att = asis.find((a) => a.practicaId === p.id);
        return [
          fullName(getPerson(p.estudianteId)),
          getInstitution(p.institucionId)?.nombre ?? "",
          p.fecha,
          p.hora,
          estado,
          att?.distanciaM ?? "",
        ];
      }),
    ]);
    toast.success("Reporte de asistencias descargado (.xlsx).");
  };
  const exportarSesiones = () => {
    downloadXlsx(`sesiones_${fecha}`, "Sesiones", [
      ["Estudiante", "Sesión", "Versión", "Estado", "Nota", "Observaciones del docente", "Actualizado"],
      ...sesiones.map((s) => [fullName(getPerson(s.estudianteId)), s.titulo, s.version, s.estado, s.nota ?? "", s.observacionesDocente ?? "", s.actualizado]),
    ]);
    toast.success("Reporte de sesiones descargado (.xlsx).");
  };

  return (
    <div className="space-y-6">
      <PageHeader title={title} description={description} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricas.map((m) => (
          <div key={m.titulo} className="surface-card space-y-1 rounded-xl border p-4">
            <p className="text-xs font-semibold text-muted-foreground uppercase">{m.titulo}</p>
            <p className="text-2xl font-bold text-primary">{m.valor}</p>
            <p className="text-xs text-muted-foreground">{m.detalle}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat label="Temprano" valor={temprano} tone="info" />
        <MiniStat label="Puntual" valor={puntual} tone="success" />
        <MiniStat label="Tarde" valor={tarde} tone="warning" />
        <MiniStat label="Falta" valor={falta} tone="danger" />
      </div>

      {filas.length === 0 ? (
        <EmptyState icon={BarChart3} title="Sin datos para reportar" description="Cuando haya estudiantes con actividad, verás aquí el resumen." />
      ) : (
        <div id="reporte-resumen" className="surface-card overflow-hidden rounded-xl border">
          <div className="flex items-center justify-between border-b bg-muted/30 p-4">
            <h3 className="text-sm font-bold">Resumen por practicante</h3>
            <span className="text-xs text-muted-foreground">{filas.length} estudiantes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/50 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="p-3">Practicante</th>
                  <th className="p-3">Institución</th>
                  <th className="p-3">Temprano</th>
                  <th className="p-3">Puntual</th>
                  <th className="p-3">Tarde</th>
                  <th className="p-3">Falta</th>
                  <th className="p-3">Promedio</th>
                  <th className="p-3">Evidencias</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filas.map((f) => (
                  <tr key={f.id} className="hover:bg-muted/20">
                    <td className="p-3 font-medium text-foreground">{f.nombre}</td>
                    <td className="p-3">{f.colegio}</td>
                    <td className="p-3">{f.temprano}</td>
                    <td className="p-3">{f.puntual}</td>
                    <td className="p-3">{f.tarde}</td>
                    <td className="p-3">{f.falta}</td>
                    <td className="p-3 font-bold">{f.nota === "—" ? "—" : `${f.nota} / 20`}</td>
                    <td className="p-3">{f.evidencias}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <ExportCard
          icon={FileSpreadsheet}
          tone="bg-emerald-500/10 text-emerald-600"
          title="Consolidado de asistencias"
          text="Institución, hora programada, Temprano/Puntual/Tarde/Falta y distancia registrada."
          button="Descargar Excel (.xlsx)"
          onClick={exportarAsistencias}
        />
        <ExportCard
          icon={FileText}
          tone="bg-blue-500/10 text-blue-600"
          title="Evaluación de sesiones"
          text="Estado, nota y observaciones del docente por sesión."
          button="Descargar Excel (.xlsx)"
          onClick={exportarSesiones}
        />
        <ExportCard
          icon={Printer}
          tone="bg-purple-500/10 text-purple-600"
          title="Resumen en PDF"
          text="Imprime o guarda como PDF el resumen por practicante."
          button="Generar PDF"
          onClick={() => exportToPdf("reporte-resumen", `Resumen_PracticIA_${fecha}`)}
          disabled={filas.length === 0}
        />
      </div>
    </div>
  );
}

function MiniStat({ label, valor, tone }: { label: string; valor: number; tone: "info" | "success" | "warning" | "danger" }) {
  const bg = { info: "bg-blue-500/10", success: "bg-emerald-500/10", warning: "bg-amber-500/10", danger: "bg-red-500/10" }[tone];
  const text = { info: "text-blue-600", success: "text-emerald-600", warning: "text-amber-600", danger: "text-red-600" }[tone];
  return (
    <div className={`surface-card rounded-xl border p-3 text-center ${bg}`}>
      <p className={`text-xl font-bold ${text}`}>{valor}</p>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase">
        <StatusBadge status={label} tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : tone === "success" ? "success" : "info"} className="mt-1" />
      </p>
    </div>
  );
}

function ExportCard({
  icon: Icon,
  tone,
  title,
  text,
  button,
  onClick,
  disabled,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tone: string;
  title: string;
  text: string;
  button: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="surface-card flex flex-col justify-between space-y-4 rounded-xl border p-5">
      <div>
        <span className={`mb-3 flex h-10 w-10 items-center justify-center rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </span>
        <h3 className="text-base font-bold">{title}</h3>
        <p className="mt-1 text-xs text-muted-foreground">{text}</p>
      </div>
      <Button onClick={onClick} disabled={!!disabled} variant="outline" className="w-full gap-2">
        <Download className="h-4 w-4" /> {button}
      </Button>
    </div>
  );
}

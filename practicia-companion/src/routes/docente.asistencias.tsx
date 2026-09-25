import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Camera, CheckCircle2, ClipboardCheck, Loader2, MapPin, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState, PageHeader, StatusBadge } from "@/components/practicia/ui-bits";
import { useCurrentUser } from "@/lib/session";
import { attendance, fullName, getInstitution, getPerson, studentsOf } from "@/lib/data";
import { abrirArchivo, confirmarAsistencia } from "@/lib/actions";

export const Route = createFileRoute("/docente/asistencias")({
  head: () => ({
    meta: [{ title: "Validación de asistencia — PracticIA Docente" }],
  }),
  component: DocenteAsistenciasPage,
});

function DocenteAsistenciasPage() {
  const user = useCurrentUser("docente");
  const mias = studentsOf(user.id).map((s) => s.id);
  const lista = attendance.filter((a) => mias.includes(a.estudianteId));
  const [ocupado, setOcupado] = useState<string | null>(null);

  const decidir = async (id: string, estado: "Confirmada" | "Observada") => {
    setOcupado(id);
    try {
      await confirmarAsistencia(id, estado);
      toast.success(estado === "Confirmada" ? "Asistencia confirmada." : "Asistencia marcada como observada.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "No se pudo actualizar.");
    } finally {
      setOcupado(null);
    }
  };

  return (
    <div>
      <PageHeader
        title="Validación de asistencias"
        description="Confirma la presencia de tus estudiantes en las instituciones asignadas."
      />
      {lista.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title="Sin asistencias registradas"
          description="Cuando tus estudiantes registren su llegada, podrás validarla aquí."
        />
      ) : (
        <div className="space-y-3">
          {lista.map((item) => {
            const inst = getInstitution(item.institucionId);
            return (
              <div
                key={item.id}
                className="surface-card flex flex-col justify-between gap-4 p-4 md:flex-row md:items-center"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <MapPin className="h-5 w-5" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold">{fullName(getPerson(item.estudianteId))}</p>
                      {item.puntualidad && <StatusBadge status={item.puntualidad} />}
                      <StatusBadge status={item.estado} />
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {inst?.nombre ?? "Institución"} · {item.fecha} · Llegada:{" "}
                      <strong className="text-foreground">{item.hora}</strong>
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">{item.ubicacion}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {item.fotoPath && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => abrirArchivo(item.fotoPath).catch((e) => toast.error(e.message))}
                    >
                      <Camera className="h-4 w-4" /> Ver foto
                    </Button>
                  )}
                  {item.estado !== "Confirmada" && (
                    <Button size="sm" disabled={ocupado === item.id} onClick={() => decidir(item.id, "Confirmada")} className="gap-1.5">
                      {ocupado === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserCheck className="h-4 w-4" />}
                      Validar llegada
                    </Button>
                  )}
                  {item.estado !== "Observada" && (
                    <Button size="sm" variant="outline" disabled={ocupado === item.id} onClick={() => decidir(item.id, "Observada")} className="gap-1.5">
                      <AlertTriangle className="h-4 w-4" /> Observar
                    </Button>
                  )}
                  {item.estado === "Confirmada" && (
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> Conforme
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/practicia/shared-pages";

export const Route = createFileRoute("/docente/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones docente — PracticIA" },
      {
        name: "description",
        content:
          "Avisos de asistencias registradas, sesiones enviadas y documentos que requieren tu revisión.",
      },
      { property: "og:title", content: "Notificaciones docente — PracticIA" },
      { property: "og:description", content: "Todo lo que ocurre con tus estudiantes." },
    ],
  }),
  component: () => <NotificationsPage role="docente" />,
});

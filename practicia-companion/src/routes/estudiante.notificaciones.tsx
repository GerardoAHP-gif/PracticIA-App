import { createFileRoute } from "@tanstack/react-router";
import { NotificationsPage } from "@/components/practicia/shared-pages";

export const Route = createFileRoute("/estudiante/notificaciones")({
  head: () => ({
    meta: [
      { title: "Notificaciones — PracticIA" },
      {
        name: "description",
        content:
          "Centro de notificaciones de la estudiante: recordatorios de prácticas, revisiones de sesión y avisos de tu docente.",
      },
      { property: "og:title", content: "Notificaciones — PracticIA" },
      { property: "og:description", content: "Recordatorios y avisos de tus prácticas." },
    ],
  }),
  component: () => <NotificationsPage role="estudiante" />,
});

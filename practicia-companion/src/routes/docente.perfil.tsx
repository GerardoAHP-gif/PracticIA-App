import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/practicia/shared-pages";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/docente/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil docente — PracticIA" },
      {
        name: "description",
        content: "Datos institucionales de la docente y preferencias de notificaciones.",
      },
      { property: "og:title", content: "Perfil docente — PracticIA" },
      { property: "og:description", content: "Tu información y preferencias en PracticIA." },
    ],
  }),
  component: TeacherProfile,
});

function TeacherProfile() {
  const user = useCurrentUser("docente");
  return <ProfilePage role="docente" user={user} />;
}

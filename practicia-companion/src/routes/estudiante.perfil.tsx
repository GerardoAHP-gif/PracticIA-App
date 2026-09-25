import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/practicia/shared-pages";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/estudiante/perfil")({
  head: () => ({
    meta: [
      { title: "Mi perfil — PracticIA" },
      {
        name: "description",
        content:
          "Consulta tus datos institucionales y administra permisos de ubicación, cámara y notificaciones.",
      },
      { property: "og:title", content: "Mi perfil — PracticIA" },
      { property: "og:description", content: "Datos institucionales y preferencias de la app." },
    ],
  }),
  component: StudentProfile,
});

function StudentProfile() {
  const user = useCurrentUser("estudiante");
  return <ProfilePage role="estudiante" user={user} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { ProfilePage } from "@/components/practicia/shared-pages";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/admin/perfil")({
  head: () => ({
    meta: [
      { title: "Perfil administrador — PracticIA" },
      {
        name: "description",
        content: "Datos de la cuenta administradora y preferencias de la plataforma PracticIA.",
      },
      { property: "og:title", content: "Perfil administrador — PracticIA" },
      { property: "og:description", content: "Cuenta administradora de PracticIA." },
    ],
  }),
  component: AdminProfile,
});

function AdminProfile() {
  const user = useCurrentUser("admin");
  return <ProfilePage role="admin" user={user} />;
}

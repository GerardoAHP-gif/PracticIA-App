import { createFileRoute } from "@tanstack/react-router";
import { UserTable } from "@/components/practicia/user-table";

export const Route = createFileRoute("/admin/usuarios")({
  head: () => ({
    meta: [
      { title: "Gestión de usuarios — PracticIA" },
      {
        name: "description",
        content:
          "Crea, edita y activa o desactiva estudiantes, docentes y administradores del programa de prácticas.",
      },
      { property: "og:title", content: "Gestión de usuarios — PracticIA" },
      { property: "og:description", content: "Directorio institucional de PracticIA." },
    ],
  }),
  component: () => (
    <UserTable
      title="Usuarios"
      description="Directorio completo de la plataforma."
      roles={["estudiante", "docente", "admin"]}
    />
  ),
});

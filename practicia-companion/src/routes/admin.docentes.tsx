import { createFileRoute } from "@tanstack/react-router";
import { UserTable } from "@/components/practicia/user-table";

export const Route = createFileRoute("/admin/docentes")({
  head: () => ({
    meta: [
      { title: "Docentes — PracticIA" },
      {
        name: "description",
        content:
          "Administra las docentes acompañantes, sus datos institucionales y su estado en la plataforma.",
      },
      { property: "og:title", content: "Docentes — PracticIA" },
      { property: "og:description", content: "Equipo docente de acompañamiento." },
    ],
  }),
  component: () => (
    <UserTable
      title="Docentes"
      description="Docentes responsables del acompañamiento de prácticas."
      roles={["docente"]}
    />
  ),
});

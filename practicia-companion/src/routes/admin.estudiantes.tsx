import { createFileRoute } from "@tanstack/react-router";
import { UserTable } from "@/components/practicia/user-table";

export const Route = createFileRoute("/admin/estudiantes")({
  head: () => ({
    meta: [
      { title: "Estudiantes — PracticIA" },
      {
        name: "description",
        content:
          "Administra las estudiantes inscritas en el programa de prácticas profesionales y su estado de cuenta.",
      },
      { property: "og:title", content: "Estudiantes — PracticIA" },
      { property: "og:description", content: "Padrón de estudiantes en prácticas." },
    ],
  }),
  component: () => (
    <UserTable
      title="Estudiantes"
      description="Estudiantes inscritas en el programa de prácticas."
      roles={["estudiante"]}
    />
  ),
});

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/practicia/app-shell";
import { RoleGate } from "@/components/practicia/role-gate";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/docente")({
  component: TeacherLayout,
});

function TeacherLayout() {
  return (
    <RoleGate role="docente">
      <Shell />
    </RoleGate>
  );
}

function Shell() {
  const user = useCurrentUser("docente");
  return (
    <AppShell role="docente" user={user}>
      <Outlet />
    </AppShell>
  );
}

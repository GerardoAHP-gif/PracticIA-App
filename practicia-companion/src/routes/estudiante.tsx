import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/practicia/app-shell";
import { RoleGate } from "@/components/practicia/role-gate";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/estudiante")({
  component: StudentLayout,
});

function StudentLayout() {
  return (
    <RoleGate role="estudiante">
      <Shell />
    </RoleGate>
  );
}

function Shell() {
  const user = useCurrentUser("estudiante");
  return (
    <AppShell role="estudiante" user={user}>
      <Outlet />
    </AppShell>
  );
}

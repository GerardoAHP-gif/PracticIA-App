import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/practicia/app-shell";
import { RoleGate } from "@/components/practicia/role-gate";
import { useCurrentUser } from "@/lib/session";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleGate role="admin">
      <Shell />
    </RoleGate>
  );
}

function Shell() {
  const user = useCurrentUser("admin");
  return (
    <AppShell role="admin" user={user}>
      <Outlet />
    </AppShell>
  );
}

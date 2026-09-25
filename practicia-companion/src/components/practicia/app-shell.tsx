import { useState, type ReactNode } from "react";
import { Link, useRouter, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  Camera,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Map,
  MessageSquareText,
  MoreHorizontal,
  NotebookPen,
  Route as RouteIcon,
  Settings,
  Sparkles,
  User,
  Users,
  BarChart3,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { BrandLockup, BrandMark } from "./brand";
import { cn } from "@/lib/utils";
import { logoutSession, roleLabel } from "@/lib/session";
import { fullName, initials, notifications, useDataVersion, type Person, type Role } from "@/lib/data";

export interface NavItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const studentNav: NavItem[] = [
  { label: "Inicio", to: "/estudiante", icon: LayoutDashboard },
  { label: "Mi práctica", to: "/estudiante/mi-practica", icon: RouteIcon },
  { label: "Calendario", to: "/estudiante/calendario", icon: CalendarDays },
  { label: "Asistente IA", to: "/estudiante/asistente", icon: Sparkles },
  { label: "Sesiones", to: "/estudiante/sesiones", icon: BookOpen },
  { label: "Asistencia", to: "/estudiante/asistencia", icon: ClipboardCheck },
  { label: "Evidencias", to: "/estudiante/evidencias", icon: Camera },
  { label: "Anecdotario", to: "/estudiante/anecdotario", icon: NotebookPen },
  { label: "Notificaciones", to: "/estudiante/notificaciones", icon: Bell },
  { label: "Perfil", to: "/estudiante/perfil", icon: User },
];

export const teacherNav: NavItem[] = [
  { label: "Inicio", to: "/docente", icon: LayoutDashboard },
  { label: "Mis estudiantes", to: "/docente/estudiantes", icon: Users },
  { label: "Seguimiento", to: "/docente/seguimiento", icon: RouteIcon },
  { label: "Mapa", to: "/docente/mapa", icon: Map },
  { label: "Sesiones", to: "/docente/sesiones", icon: BookOpen },
  { label: "Asistencias", to: "/docente/asistencias", icon: ClipboardCheck },
  { label: "Evidencias", to: "/docente/evidencias", icon: Camera },
  { label: "Anecdotarios", to: "/docente/anecdotarios", icon: NotebookPen },
  { label: "Reportes", to: "/docente/reportes", icon: BarChart3 },
  { label: "Notificaciones", to: "/docente/notificaciones", icon: Bell },
  { label: "Perfil", to: "/docente/perfil", icon: User },
];

export const adminNav: NavItem[] = [
  { label: "Dashboard", to: "/admin", icon: LayoutDashboard },
  { label: "Usuarios", to: "/admin/usuarios", icon: Users },
  { label: "Estudiantes", to: "/admin/estudiantes", icon: GraduationCap },
  { label: "Docentes", to: "/admin/docentes", icon: MessageSquareText },
  { label: "Instituciones", to: "/admin/instituciones", icon: Building2 },
  { label: "Prácticas", to: "/admin/practicas", icon: CalendarDays },
  { label: "Asistencias", to: "/admin/asistencias", icon: ClipboardCheck },
  { label: "Reportes", to: "/admin/reportes", icon: BarChart3 },
  { label: "Configuración", to: "/admin/configuracion", icon: Settings },
  { label: "Perfil", to: "/admin/perfil", icon: User },
];

export const navByRole: Record<Role, NavItem[]> = {
  estudiante: studentNav,
  docente: teacherNav,
  admin: adminNav,
};

/** Los paths se declaran como string; el router los valida en runtime. */
export const linkTo = (path: string) => path as "/";

function useActivePath() {
  return useRouterState({ select: (s) => s.location.pathname });
}

function isActive(pathname: string, to: string, items: NavItem[]) {
  if (pathname === to) return true;
  if (!pathname.startsWith(to + "/")) return false;
  // evita marcar el índice de rol cuando hay una ruta hija más específica
  return !items.some((i) => i.to !== to && (pathname === i.to || pathname.startsWith(i.to + "/")));
}

function SignOutButton({ className }: { className?: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={async () => {
        await logoutSession();
        router.navigate({ to: "/", replace: true });
      }}
      className={cn(
        "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
      Cerrar sesión
    </button>
  );
}

export function AppShell({
  role,
  user,
  children,
}: {
  role: Role;
  user: Person;
  children: ReactNode;
}) {
  useDataVersion();
  const items = navByRole[role];
  const pathname = useActivePath();
  const [moreOpen, setMoreOpen] = useState(false);
  const primary = items.slice(0, 4);
  const rest = items.slice(4);
  const unread = notifications.filter((n) => n.para === role && !n.leida).length;
  const active = items.find((i) => isActive(pathname, i.to, items));
  const notifTo = `/${role}/notificaciones`;

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar (tablet / desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col bg-sidebar px-4 py-5 text-sidebar-foreground md:flex">
        <Link to={linkTo(homeOf(role))} className="mb-6 flex items-center gap-3 px-1">
          <BrandMark className="h-10 w-10" />
          <div className="leading-tight">
            <p className="text-lg font-extrabold tracking-tight text-sidebar-foreground">
              Practic<span className="text-sidebar-primary">IA</span>
            </p>
            <p className="text-[11px] text-sidebar-foreground/60">{roleLabel[role]}</p>
          </div>
        </Link>
        <nav className="flex-1 space-y-1 overflow-y-auto">
          {items.map((item) => {
            const act = isActive(pathname, item.to, items);
            return (
              <Link
                key={item.to}
                to={linkTo(item.to)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  act
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-card"
                    : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {item.label.startsWith("Notificaci") && unread > 0 && (
                  <span className="ml-auto rounded-full bg-destructive px-1.5 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 border-t border-sidebar-border pt-3">
          <div className="mb-2 flex items-center gap-3 px-2">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-bold">
              {initials(user)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{fullName(user)}</p>
              <p className="truncate text-[11px] text-sidebar-foreground/60">{user.correo}</p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="md:pl-64">
        {/* Topbar */}
        <header className="sticky top-0 z-30 border-b border-border bg-card/85 backdrop-blur-md">
          <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
            <div className="md:hidden">
              <BrandLockup compact />
            </div>
            <p className="hidden truncate text-sm font-semibold md:block">
              {active?.label ?? roleLabel[role]}
            </p>
            <div className="ml-auto flex items-center gap-2">
              <Link
                to={linkTo(notifTo)}
                className="relative flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Notificaciones"
              >
                <Bell className="h-4 w-4" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                    {unread}
                  </span>
                )}
              </Link>
              <Link
                to={linkTo(`/${role}/perfil`)}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                aria-label="Perfil"
              >
                {initials(user)}
              </Link>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pt-4 pb-28 md:pb-10">{children}</main>
      </div>

      {/* Bottom navigation (móvil) */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden">
        <div className="grid grid-cols-5">
          {primary.map((item) => {
            const act = isActive(pathname, item.to, items);
            return (
              <Link
                key={item.to}
                to={linkTo(item.to)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                  act ? "text-primary" : "text-muted-foreground",
                )}
              >
                <item.icon className={cn("h-5 w-5", act && "scale-110")} />
                <span className="max-w-full truncate px-1">{item.label}</span>
              </Link>
            );
          })}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-muted-foreground"
              >
                <MoreHorizontal className="h-5 w-5" />
                Más
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="rounded-t-2xl">
              <SheetHeader className="pb-0">
                <SheetTitle>Menú · {roleLabel[role]}</SheetTitle>
              </SheetHeader>
              <div className="grid grid-cols-3 gap-2 px-4 pb-6">
                {rest.map((item) => (
                  <Link
                    key={item.to}
                    to={linkTo(item.to)}
                    onClick={() => setMoreOpen(false)}
                    className="surface-card flex flex-col items-center gap-2 px-2 py-4 text-center text-xs font-semibold"
                  >
                    <item.icon className="h-5 w-5 text-primary" />
                    <span className="leading-tight">{item.label}</span>
                  </Link>
                ))}
              </div>
              <div className="px-4 pb-6">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={async () => {
                    await logoutSession();
                    window.location.href = "/";
                  }}
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </nav>
    </div>
  );
}

function homeOf(role: Role) {
  return role === "estudiante" ? "/estudiante" : role === "docente" ? "/docente" : "/admin";
}

export { FileText };

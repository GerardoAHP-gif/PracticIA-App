import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "@tanstack/react-router";
import { Loader2, ShieldAlert, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { clearData, loadData, PERFIL_NO_ENCONTRADO, type Role } from "@/lib/data";
import { homeFor, logoutSession } from "@/lib/session";

type State = "checking" | "ready" | "no-profile" | "inactive" | "error";

/**
 * Protege cada sección por rol y carga los datos reales desde Supabase.
 *  - Sin sesión → login.
 *  - Rol distinto → redirige a su propia sección.
 *  - Sin perfil / inactivo → mensaje claro.
 */
export function RoleGate({ role, children }: { role: Role; children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<State>("checking");
  const [detail, setDetail] = useState("");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState("checking");

    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        router.navigate({ to: "/", replace: true });
        return;
      }
      try {
        const me = await loadData(data.session.user.id);
        if (cancelled) return;
        if (me.estado === "Inactivo") {
          setState("inactive");
          return;
        }
        if (me.rol !== role) {
          router.navigate({ to: homeFor[me.rol] as "/", replace: true });
          return;
        }
        setState("ready");
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        if (msg === PERFIL_NO_ENCONTRADO) setState("no-profile");
        else {
          console.error("[PracticIA] Error cargando datos:", e);
          setDetail(msg);
          setState("error");
        }
      }
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        clearData();
        router.navigate({ to: "/", replace: true });
      }
    });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [role, router, attempt]);

  const salir = async () => {
    await logoutSession();
    router.navigate({ to: "/", replace: true });
  };

  if (state === "ready") return <>{children}</>;

  if (state === "checking") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
        <p className="text-sm">Cargando tu espacio de trabajo…</p>
      </div>
    );
  }

  const isProblem = state === "error";
  const Icon = isProblem ? WifiOff : ShieldAlert;
  const title =
    state === "no-profile"
      ? "Tu cuenta aún no tiene un perfil"
      : state === "inactive"
        ? "Tu cuenta está inactiva"
        : "No pudimos cargar tus datos";
  const text =
    state === "no-profile"
      ? "Iniciaste sesión correctamente, pero tu usuario no está registrado en PracticIA. Pide al administrador que te dé de alta."
      : state === "inactive"
        ? "El administrador desactivó tu cuenta. Comunícate con tu institución si crees que es un error."
        : "Revisa tu conexión e inténtalo de nuevo.";

  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="surface-card max-w-md p-6 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <Icon className="h-6 w-6" />
        </span>
        <h1 className="mt-4 text-lg font-bold">{title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{text}</p>
        {isProblem && detail && (
          <p className="mt-2 break-words rounded-lg bg-muted p-2 text-left text-[11px] text-muted-foreground">{detail}</p>
        )}
        <div className="mt-5 grid gap-2">
          {isProblem && (
            <Button onClick={() => setAttempt((n) => n + 1)} className="h-11">
              Reintentar
            </Button>
          )}
          <Button variant={isProblem ? "outline" : "default"} onClick={salir} className="h-11">
            Cerrar sesión
          </Button>
        </div>
      </div>
    </div>
  );
}

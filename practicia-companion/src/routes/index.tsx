import { useEffect, useState } from "react";
import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { Eye, EyeOff, Loader2, ShieldCheck, Sparkles, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { BrandMark } from "@/components/practicia/brand";
import { fetchMyProfile, homeFor, logoutSession, type Role } from "@/lib/session";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Iniciar sesión — PracticIA" },
      {
        name: "description",
        content:
          "Accede a PracticIA: acompañamiento inteligente para estudiantes, docentes y administradores de prácticas profesionales.",
      },
      { property: "og:title", content: "Iniciar sesión — PracticIA" },
      {
        property: "og:description",
        content: "Acompañamiento inteligente para tus prácticas profesionales.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recovery, setRecovery] = useState(false);

  const irASuSeccion = (rol: Role) => router.navigate({ to: homeFor[rol] as "/", replace: true });

  // Si ya hay una sesión real de Supabase, entra directo a su sección.
  // También detecta cuando se llega desde el enlace de "recuperar contraseña".
  useEffect(() => {
    let cancelled = false;
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    (async () => {
      const perfil = await fetchMyProfile();
      if (!cancelled && perfil && perfil.estado !== "Inactivo" && !window.location.hash.includes("type=recovery")) {
        irASuSeccion(perfil.rol);
      }
    })();
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailTrimmed = correo.trim().toLowerCase();
    if (!emailTrimmed || !password) {
      setError("Por favor, ingresa tu correo y contraseña.");
      return;
    }

    setLoading(true);
    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email: emailTrimmed,
        password,
      });
      if (authError || !data.user) {
        setError("Correo o contraseña incorrectos. Verifica tus datos e inténtalo nuevamente.");
        return;
      }

      // El rol SIEMPRE sale de la tabla `perfiles` (nunca del navegador).
      const perfil = await fetchMyProfile();
      if (!perfil) {
        await logoutSession();
        setError("Tu cuenta no tiene un perfil asignado. Pide al administrador que te dé de alta.");
        return;
      }
      if (perfil.estado === "Inactivo") {
        await logoutSession();
        setError("Tu cuenta está inactiva. Comunícate con el administrador.");
        return;
      }
      irASuSeccion(perfil.rol);
    } catch (err) {
      console.error("Error en submit login:", err);
      setError("Ocurrió un error inesperado. Por favor, reintenta.");
    } finally {
      setLoading(false);
    }
  };

  if (recovery) return <NewPasswordForm onDone={() => setRecovery(false)} />;

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      {/* Panel de marca */}
      <div className="gradient-brand relative hidden flex-1 flex-col justify-between p-12 text-primary-foreground lg:flex">
        <div className="flex items-center gap-3">
          <BrandMark className="h-12 w-12" />
          <p className="text-2xl font-extrabold tracking-tight">PracticIA</p>
        </div>
        <div className="max-w-md">
          <h2 className="text-3xl leading-tight font-extrabold">
            Acompañamiento inteligente para tus prácticas profesionales.
          </h2>
          <p className="mt-3 text-sm text-primary-foreground/80">
            Una plataforma que acompaña a la estudiante antes, durante y después de cada práctica.
          </p>
          <ul className="mt-8 space-y-4 text-sm">
            <li className="flex items-center gap-3">
              <Sparkles className="h-5 w-5" /> Recomendaciones de IA para tus sesiones
            </li>
            <li className="flex items-center gap-3">
              <MapPin className="h-5 w-5" /> Ruta a la institución y registro de llegada
            </li>
            <li className="flex items-center gap-3">
              <ShieldCheck className="h-5 w-5" /> Evaluación final siempre a cargo de tu docente
            </li>
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Instituciones de educación superior · Perú
        </p>
      </div>

      {/* Formulario */}
      <div className="flex flex-1 items-center justify-center px-5 py-10">
        <div className="w-full max-w-sm">
          <div className="flex flex-col items-center text-center lg:hidden">
            <BrandMark className="h-16 w-16" />
            <h1 className="mt-4 text-2xl font-extrabold tracking-tight">
              Practic<span className="text-primary">IA</span>
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Acompañamiento inteligente para tus prácticas profesionales.
            </p>
          </div>

          <h2 className="mt-8 mb-1 text-xl font-bold lg:mt-0">Iniciar sesión</h2>
          <p className="mb-6 text-sm text-muted-foreground">
            Ingresa con tu correo institucional.
          </p>

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo institucional</Label>
              <Input
                id="correo"
                type="email"
                autoComplete="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@ejemplo.edu.pe"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Contraseña</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={show ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted-foreground"
                  aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
                >
                  {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                to="/recuperar-contrasena"
                className="text-xs font-semibold text-primary hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>

            <Button type="submit" className="h-11 w-full text-base" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "Verificando..." : "Iniciar sesión"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

function NewPasswordForm({ onDone }: { onDone: () => void }) {
  const router = useRouter();
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const guardar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pass.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (pass !== pass2) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: pass });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await logoutSession();
    window.history.replaceState(null, "", "/");
    onDone();
    router.navigate({ to: "/", replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <form onSubmit={guardar} className="w-full max-w-sm space-y-4">
        <BrandMark className="h-14 w-14" />
        <div>
          <h1 className="text-xl font-bold">Crea tu nueva contraseña</h1>
          <p className="mt-1 text-sm text-muted-foreground">Después podrás iniciar sesión con ella.</p>
        </div>
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="np1">Nueva contraseña</Label>
          <Input id="np1" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="np2">Repite la contraseña</Label>
          <Input id="np2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
        </div>
        <Button type="submit" className="h-11 w-full" disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Guardar contraseña
        </Button>
      </form>
    </div>
  );
}

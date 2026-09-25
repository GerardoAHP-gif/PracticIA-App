import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/practicia/brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/recuperar-contrasena")({
  head: () => ({
    meta: [
      { title: "Recuperar contraseña — PracticIA" },
      {
        name: "description",
        content:
          "Recupera el acceso a tu cuenta de PracticIA con tu correo institucional en pocos pasos.",
      },
      { property: "og:title", content: "Recuperar contraseña — PracticIA" },
      {
        property: "og:description",
        content: "Recupera el acceso a tu cuenta institucional de PracticIA.",
      },
    ],
  }),
  component: RecoverPage,
});

function RecoverPage() {
  const [correo, setCorreo] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enviar = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(correo.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/`,
    });
    setLoading(false);
    // Por seguridad no revelamos si el correo existe: solo avisamos de errores reales (red, límite de envíos).
    if (err && !/not found|no user/i.test(err.message)) {
      setError(
        /rate|seconds|limit/i.test(err.message)
          ? "Ya solicitaste un enlace hace poco. Espera un minuto e inténtalo de nuevo."
          : "No se pudo enviar el correo. Inténtalo más tarde.",
      );
      return;
    }
    setSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Volver al inicio de sesión
        </Link>
        <BrandMark className="h-14 w-14" />
        {sent ? (
          <div className="mt-6">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-success/12 text-success">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-xl font-bold">Revisa tu correo</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Enviamos un enlace de recuperación a <strong>{correo}</strong>. Si ese correo está registrado,
              el enlace vence pronto: revisa también la carpeta de spam.
            </p>
            <Button asChild className="mt-6 h-11 w-full">
              <Link to="/">Volver a iniciar sesión</Link>
            </Button>
          </div>
        ) : (
          <form
            className="mt-6 space-y-4"
            onSubmit={enviar}
          >
            <div>
              <h1 className="text-xl font-bold">¿Olvidaste tu contraseña?</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Ingresa tu correo institucional y te enviaremos instrucciones para restablecerla.
              </p>
            </div>
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="correo">Correo institucional</Label>
              <Input
                id="correo"
                type="email"
                required
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="nombre@practicia.edu.pe"
              />
            </div>
            <Button type="submit" className="h-11 w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MailCheck className="h-4 w-4" />
              )}
              {loading ? "Enviando..." : "Enviar instrucciones"}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}

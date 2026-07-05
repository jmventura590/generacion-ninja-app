import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/adn/reset-password")({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);

  // Al llegar desde el mail, Supabase pone tokens en el hash y dispara PASSWORD_RECOVERY.
  useEffect(() => {
    // Chequeo inicial: si ya hay sesión (hash procesado por el cliente) habilitamos el form.
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => { sub.subscription.unsubscribe(); };
  }, []);

  const [errors, setErrors] = useState<Record<string, string>>({});
  function clearError(f: string) {
    setErrors((prev) => {
      if (!prev[f]) return prev;
      const { [f]: _drop, ...rest } = prev;
      return rest;
    });
  }
  const inputCls = (f: string) => `adn-input ${errors[f] ? "border-red-500 focus:border-red-500" : ""}`;
  const FieldError = ({ f }: { f: string }) =>
    errors[f] ? <div className="mt-1 text-[11px] text-red-400 font-medium">{errors[f]}</div> : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!pwd) local.pwd = "La contraseña es obligatoria.";
    else if (pwd.length < 4) local.pwd = "La contraseña debe tener al menos 4 caracteres.";
    if (!pwd2) local.pwd2 = "Repetí la contraseña.";
    else if (pwd && pwd !== pwd2) local.pwd2 = "Las contraseñas no coinciden.";
    if (Object.keys(local).length) { setErrors(local); return; }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pwd });
      if (error) throw error;
      toast.success("Contraseña actualizada. Ya podés ingresar.");
      await supabase.auth.signOut();
      navigate({ to: "/adn/auth" });
    } catch (err: any) {
      setErrors({ form: err?.message ?? "No se pudo actualizar la contraseña." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-black"><span className="adn-fluor">NUEVA</span> <span className="adn-violet">CONTRASEÑA</span></h1>
          <p className="mt-1 text-sm text-white/60">Elegí una contraseña para tu cuenta.</p>
        </div>

        <div className="adn-card p-5 space-y-3">
          {!ready ? (
            <div className="text-sm text-white/60 text-center py-8">
              Validando el link de recuperación...
              <div className="text-[11px] text-white/40 mt-3">
                Si abriste esta página sin hacer click en el mail, volvé al login y pedí un nuevo link.
              </div>
            </div>
          ) : (
            <form onSubmit={submit} noValidate className="space-y-3">
              <div>
                <input className={inputCls("pwd")} type="password" placeholder="nueva contraseña" value={pwd}
                  onChange={(e) => { setPwd(e.target.value); clearError("pwd"); }} autoFocus />
                <FieldError f="pwd" />
              </div>
              <div>
                <input className={inputCls("pwd2")} type="password" placeholder="repetir contraseña" value={pwd2}
                  onChange={(e) => { setPwd2(e.target.value); clearError("pwd2"); }} />
                <FieldError f="pwd2" />
              </div>
              {errors.form && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{errors.form}</div>}
              <button disabled={busy} className="adn-btn-primary w-full py-3">
                {busy ? "Guardando..." : "Guardar contraseña"}
              </button>
            </form>
          )}
          <button
            type="button"
            onClick={() => navigate({ to: "/adn/auth" })}
            className="w-full text-[11px] text-white/50 hover:text-[var(--adn-fluor)] underline underline-offset-2"
          >
            Volver al login
          </button>
        </div>
      </div>
    </div>
  );
}

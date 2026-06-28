import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { seedAdnDemo } from "@/lib/adn-seed.functions";
import { USERNAME_DOMAIN } from "@/lib/adn-students.functions";

export const Route = createFileRoute("/adn/auth")({
  component: AuthPage,
});

const MOCKS = [
  { label: "Coach (PIN 1986)", email: "coach@adn.test", password: "Coach1986!" },
  { label: "Benja (rojo)",     email: "benja@adn.test", password: "Ninja2026!" },
  { label: "Cata (azul)",      email: "cata@adn.test", password: "Ninja2026!" },
  { label: "Morena (verde)",   email: "morena@adn.test", password: "Ninja2026!" },
  { label: "Bauti (blanco)",   email: "bauti@adn.test", password: "Ninja2026!" },
  { label: "Fran (verde)",     email: "fran@adn.test", password: "Ninja2026!" },
];

function AuthPage() {
  const navigate = useNavigate();
  const seedFn = useServerFn(seedAdnDemo);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [studentPwd, setStudentPwd] = useState("");
  const [mode, setMode] = useState<"student" | "signin" | "signup">("student");
  const [busy, setBusy] = useState(false);

  async function studentLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const u = username.trim().toLowerCase();
      const { error } = await supabase.auth.signInWithPassword({ email: `${u}@${USERNAME_DOMAIN}`, password: studentPwd });
      if (error) throw error;
      navigate({ to: "/adn" });
    } catch (err: any) {
      toast.error(err?.message ?? "Usuario o contraseña incorrectos.");
    } finally {
      setBusy(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin + "/adn" },
        });
        if (error) throw error;
        toast.success("Cuenta creada. Iniciá sesión.");
        setMode("signin");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/adn" });
      }
    } catch (err: any) {
      toast.error(err.message ?? "Error");
    } finally {
      setBusy(false);
    }
  }

  async function fillAndSignIn(m: { email: string; password: string }) {
    setEmail(m.email);
    setPassword(m.password);
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: m.email, password: m.password });
      if (error) {
        toast.error("Primero corré 'Cargar demo'");
        return;
      }
      navigate({ to: "/adn" });
    } finally {
      setBusy(false);
    }
  }

  async function seed() {
    setBusy(true);
    try {
      const r = await seedFn({});
      toast.success(r.skipped ? "Demo ya estaba cargada." : "Demo cargada — usá las cuentas de abajo.");
    } catch (e: any) {
      toast.error(e.message ?? "Error sembrando demo");
    } finally {
      setBusy(false);
    }
  }

  async function googleSignIn() {
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin + "/adn/auth",
      });
      if (result.error) {
        toast.error((result.error as any)?.message ?? "No se pudo iniciar sesión con Google");
        return;
      }
      if (result.redirected) return; // browser navigating away
      navigate({ to: "/adn" });
    } catch (e: any) {
      toast.error(e?.message ?? "Error con Google");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mt-2 text-3xl font-black"><span className="adn-fluor">GENERACIÓN</span> <span className="adn-violet">ADN</span></h1>
          <p className="mt-1 text-sm text-white/60">Acceso familia / coach</p>
        </div>

        <button
          type="button"
          onClick={googleSignIn}
          disabled={busy}
          className="w-full flex items-center justify-center gap-3 py-3 rounded-lg bg-white text-black font-bold text-sm hover:bg-white/90 disabled:opacity-60"
        >
          <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6.1 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.4 44 30.1 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continuar con Google
        </button>

        <div className="flex items-center gap-3 text-[10px] uppercase tracking-widest text-white/30">
          <span className="flex-1 h-px bg-white/10" /> o con usuario / email <span className="flex-1 h-px bg-white/10" />
        </div>

        <div className="adn-card p-5 space-y-3">
          <div className="flex gap-1 text-[11px]">
            <button type="button" onClick={() => setMode("student")} className={`flex-1 py-2 rounded-lg ${mode==="student" ? "bg-white/10 text-white" : "text-white/50"}`}>Alumno</button>
            <button type="button" onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg ${mode==="signin" ? "bg-white/10 text-white" : "text-white/50"}`}>Familia (email)</button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg ${mode==="signup" ? "bg-white/10 text-white" : "text-white/50"}`}>Crear</button>
          </div>

          {mode === "student" ? (
            <form onSubmit={studentLogin} className="space-y-3">
              <input className="adn-input" placeholder="usuario" value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
                autoCapitalize="off" autoCorrect="off" required minLength={3} />
              <input className="adn-input" type="password" placeholder="contraseña" value={studentPwd}
                onChange={(e) => setStudentPwd(e.target.value)} required minLength={4} />
              <button disabled={busy} className="adn-btn-primary w-full py-3">Ingresar</button>
              <p className="text-[10px] text-white/40 text-center">El coach te entrega usuario y contraseña.</p>
            </form>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <input className="adn-input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              <input className="adn-input" type="password" placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              <button disabled={busy} className="adn-btn-primary w-full py-3">{mode === "signin" ? "Ingresar" : "Crear cuenta"}</button>
            </form>
          )}
        </div>

        <div className="adn-card p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-widest text-white/60">Demo</div>
            <button onClick={seed} disabled={busy} className="adn-btn-secondary px-3 py-1.5 text-xs">Cargar demo</button>
          </div>
          <p className="text-xs text-white/50">Tocá una cuenta para entrar al toque (después de "Cargar demo"):</p>
          <div className="grid grid-cols-2 gap-2">
            {MOCKS.map((m) => (
              <button key={m.email} onClick={() => fillAndSignIn(m)} disabled={busy}
                className="text-left text-xs rounded-lg border border-white/10 bg-black/40 hover:border-[var(--adn-fluor)] px-3 py-2">
                <div className="font-bold text-white">{m.label}</div>
                <div className="text-white/40 truncate">{m.email}</div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

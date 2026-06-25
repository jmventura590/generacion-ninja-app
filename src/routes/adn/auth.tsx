import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedAdnDemo } from "@/lib/adn-seed.functions";

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
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="min-h-screen px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="text-xs text-white/40 hover:text-white/70">← volver a Mi Camino Ninja</Link>
          <h1 className="mt-2 text-3xl font-black"><span className="adn-fluor">GENERACIÓN</span> <span className="adn-violet">ADN</span></h1>
          <p className="mt-1 text-sm text-white/60">Acceso familia / coach</p>
        </div>

        <form onSubmit={submit} className="adn-card p-5 space-y-3">
          <div className="flex gap-2 text-xs">
            <button type="button" onClick={() => setMode("signin")} className={`flex-1 py-2 rounded-lg ${mode==="signin" ? "bg-white/10 text-white" : "text-white/50"}`}>Ingresar</button>
            <button type="button" onClick={() => setMode("signup")} className={`flex-1 py-2 rounded-lg ${mode==="signup" ? "bg-white/10 text-white" : "text-white/50"}`}>Crear cuenta</button>
          </div>
          <input className="adn-input" type="email" placeholder="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <input className="adn-input" type="password" placeholder="contraseña" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
          <button disabled={busy} className="adn-btn-primary w-full py-3">{mode === "signin" ? "Ingresar" : "Crear cuenta"}</button>
        </form>

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

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { seedAdnDemo } from "@/lib/adn-seed.functions";
import { resolveLoginEmail, listPilotStudents, resolveRecoveryEmail } from "@/lib/adn-students.functions";

export const Route = createFileRoute("/adn/auth")({
  component: AuthPage,
});

// Coach siempre fijo. El resto (alumnos piloto) se carga dinámicamente desde la BD.
const COACH_MOCK = { label: "Coach (PIN 1986)", email: "coach@adn.test", password: "Coach1986!" };

type PilotEntry = { label: string; username: string };

function AuthPage() {
  const navigate = useNavigate();
  const seedFn = useServerFn(seedAdnDemo);
  const resolveFn = useServerFn(resolveLoginEmail);
  const listPilotsFn = useServerFn(listPilotStudents);
  const recoveryFn = useServerFn(resolveRecoveryEmail);

  const [mode, setMode] = useState<"user" | "coach">("user");
  const [username, setUsername] = useState("");
  const [pwd, setPwd] = useState("");
  const [coachEmail, setCoachEmail] = useState("");
  const [coachPwd, setCoachPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [pilots, setPilots] = useState<PilotEntry[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Recovery modal
  const [recOpen, setRecOpen] = useState(false);
  const [recUser, setRecUser] = useState("");
  const [recBusy, setRecBusy] = useState(false);
  const [recErrors, setRecErrors] = useState<Record<string, string>>({});

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _drop, ...rest } = prev;
      return rest;
    });
  }
  function clearRecError(field: string) {
    setRecErrors((prev) => {
      if (!prev[field]) return prev;
      const { [field]: _drop, ...rest } = prev;
      return rest;
    });
  }

  const inputCls = (errs: Record<string, string>, field: string) =>
    `adn-input ${errs[field] ? "border-red-500 focus:border-red-500" : ""}`;
  const FieldError = ({ errs, field }: { errs: Record<string, string>; field: string }) =>
    errs[field] ? <div className="mt-1 text-[11px] text-red-400 font-medium">{errs[field]}</div> : null;

  useEffect(() => {
    listPilotsFn({})
      .then((r) => {
        if (r.ok) {
          setPilots(
            r.students.map((s) => ({
              label: `${s.student_name} (${s.current_belt_color})`,
              username: s.username,
            })),
          );
        }
      })
      .catch(() => {});
  }, [listPilotsFn]);

  async function userLogin(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!username.trim()) local.username = "El usuario es obligatorio.";
    else if (username.trim().length < 3) local.username = "Mínimo 3 caracteres.";
    if (!pwd) local.pwd = "La contraseña es obligatoria.";
    else if (pwd.length < 4) local.pwd = "La contraseña debe tener al menos 4 caracteres.";
    if (Object.keys(local).length) { setErrors(local); return; }
    setErrors({});
    setBusy(true);
    try {
      const u = username.trim().toLowerCase();
      const r = await resolveFn({ data: { username: u } });
      if (!r.ok) { setErrors({ username: "Usuario no encontrado." }); return; }
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: pwd });
      if (error) { setErrors({ pwd: "Usuario o contraseña incorrectos." }); return; }
      navigate({ to: "/adn" });
    } catch (err: any) {
      setErrors({ form: err?.message ?? "No se pudo ingresar." });
    } finally {
      setBusy(false);
    }
  }

  async function coachLogin(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!coachEmail.trim()) local.coachEmail = "El email es obligatorio.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(coachEmail.trim())) local.coachEmail = "El email no tiene un formato válido.";
    if (!coachPwd) local.coachPwd = "La contraseña es obligatoria.";
    else if (coachPwd.length < 4) local.coachPwd = "Mínimo 4 caracteres.";
    if (Object.keys(local).length) { setErrors(local); return; }
    setErrors({});
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: coachEmail, password: coachPwd });
      if (error) { setErrors({ coachPwd: "Email o contraseña incorrectos." }); return; }
      navigate({ to: "/adn" });
    } catch (err: any) {
      setErrors({ form: err?.message ?? "Error" });
    } finally {
      setBusy(false);
    }
  }

  async function fillAndSignInPilot(entry: PilotEntry) {
    setBusy(true);
    try {
      const r = await resolveFn({ data: { username: entry.username } });
      if (!r.ok) { toast.error(r.error); return; }
      // Contraseña conocida solo si es semilla de demo; sino pedir manual.
      const { error } = await supabase.auth.signInWithPassword({ email: r.email, password: "Ninja2026!" });
      if (error) {
        toast.error("Primero corré 'Cargar demo' o ingresá con la clave manual.");
        setUsername(entry.username);
        setPwd("");
        return;
      }
      navigate({ to: "/adn" });
    } finally {
      setBusy(false);
    }
  }

  async function fillCoach() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: COACH_MOCK.email, password: COACH_MOCK.password });
      if (error) { toast.error("Primero corré 'Cargar demo'"); return; }
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
      const list = await listPilotsFn({});
      if (list.ok) {
        setPilots(list.students.map((s) => ({
          label: `${s.student_name} (${s.current_belt_color})`,
          username: s.username,
        })));
      }
    } catch (e: any) {
      toast.error(e.message ?? "Error sembrando demo");
    } finally {
      setBusy(false);
    }
  }

  async function submitRecovery(e: React.FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!recUser.trim()) local.recUser = "Ingresá tu usuario.";
    else if (recUser.trim().length < 3) local.recUser = "Mínimo 3 caracteres.";
    if (Object.keys(local).length) { setRecErrors(local); return; }
    setRecErrors({});
    setRecBusy(true);
    try {
      const u = recUser.trim().toLowerCase();
      const r = await recoveryFn({ data: { username: u } });
      if (!r.ok) { setRecErrors({ recUser: r.error }); return; }
      const redirectTo = `${window.location.origin}/adn/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(r.email, { redirectTo });
      if (error) { setRecErrors({ form: error.message }); return; }
      toast.success(
        r.kind === "family"
          ? "Te mandamos un mail para recuperar tu contraseña."
          : "Te mandamos el link de recuperación al email de tu familia.",
      );
      setRecOpen(false);
      setRecUser("");
    } catch (err: any) {
      setRecErrors({ form: err?.message ?? "No se pudo iniciar la recuperación." });
    } finally {
      setRecBusy(false);
    }
  }

  return (
    <div className="min-h-screen px-5 py-10 flex items-center justify-center">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="mt-2 text-3xl font-black"><span className="adn-fluor">GENERACIÓN</span> <span className="adn-violet">ADN</span></h1>
          <p className="mt-1 text-sm text-white/60">Acceso alumno · familia · coach</p>
        </div>

        <div className="adn-card p-5 space-y-3">
          <div className="flex gap-1 text-[11px]">
            <button type="button" onClick={() => setMode("user")} className={`flex-1 py-2 rounded-lg ${mode==="user" ? "bg-white/10 text-white" : "text-white/50"}`}>Alumno / Familia</button>
            <button type="button" onClick={() => setMode("coach")} className={`flex-1 py-2 rounded-lg ${mode==="coach" ? "bg-white/10 text-white" : "text-white/50"}`}>Coach</button>
          </div>

          {mode === "user" ? (
            <form onSubmit={userLogin} noValidate className="space-y-3">
              <div>
                <input className={inputCls(errors, "username")} placeholder="usuario" value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "")); clearError("username"); }}
                  autoCapitalize="off" autoCorrect="off" />
                <FieldError errs={errors} field="username" />
              </div>
              <div>
                <input className={inputCls(errors, "pwd")} type="password" placeholder="contraseña" value={pwd}
                  onChange={(e) => { setPwd(e.target.value); clearError("pwd"); }} />
                <FieldError errs={errors} field="pwd" />
              </div>
              {errors.form && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{errors.form}</div>}
              <button disabled={busy} className="adn-btn-primary w-full py-3">Ingresar</button>
              <button
                type="button"
                onClick={() => { setRecUser(username); setRecErrors({}); setRecOpen(true); }}
                className="w-full text-[11px] text-white/50 hover:text-[var(--adn-fluor)] underline underline-offset-2"
              >
                ¿Olvidaste tu contraseña?
              </button>
              <p className="text-[10px] text-white/40 text-center">El coach entrega usuario y contraseña a cada alumno y a su familia.</p>
            </form>
          ) : (
            <form onSubmit={coachLogin} noValidate className="space-y-3">
              <div>
                <input className={inputCls(errors, "coachEmail")} type="email" placeholder="email del coach" value={coachEmail}
                  onChange={(e) => { setCoachEmail(e.target.value); clearError("coachEmail"); }} />
                <FieldError errs={errors} field="coachEmail" />
              </div>
              <div>
                <input className={inputCls(errors, "coachPwd")} type="password" placeholder="contraseña" value={coachPwd}
                  onChange={(e) => { setCoachPwd(e.target.value); clearError("coachPwd"); }} />
                <FieldError errs={errors} field="coachPwd" />
              </div>
              {errors.form && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{errors.form}</div>}
              <button disabled={busy} className="adn-btn-primary w-full py-3">Ingresar como coach</button>
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
            <button onClick={fillCoach} disabled={busy}
              className="text-left text-xs rounded-lg border border-white/10 bg-black/40 hover:border-[var(--adn-fluor)] px-3 py-2">
              <div className="font-bold text-white">{COACH_MOCK.label}</div>
              <div className="text-white/40 truncate">{COACH_MOCK.email}</div>
            </button>
            {pilots.map((p) => (
              <button key={p.username} onClick={() => fillAndSignInPilot(p)} disabled={busy}
                className="text-left text-xs rounded-lg border border-white/10 bg-black/40 hover:border-[var(--adn-fluor)] px-3 py-2">
                <div className="font-bold text-white">{p.label}</div>
                <div className="text-white/40 truncate">@{p.username}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {recOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center px-5" onClick={() => setRecOpen(false)}>
          <div className="w-full max-w-sm adn-card p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div>
              <div className="text-lg font-bold">Recuperar contraseña</div>
              <p className="text-xs text-white/60 mt-1">
                Ingresá tu usuario. Te mandamos un mail al contacto de la familia para elegir una nueva clave.
              </p>
            </div>
            <form onSubmit={submitRecovery} noValidate className="space-y-3">
              <div>
                <input className={inputCls(recErrors, "recUser")} placeholder="usuario" value={recUser}
                  onChange={(e) => { setRecUser(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "")); clearRecError("recUser"); }}
                  autoCapitalize="off" autoCorrect="off" autoFocus />
                <FieldError errs={recErrors} field="recUser" />
              </div>
              {recErrors.form && <div className="rounded-lg border border-red-500/50 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">{recErrors.form}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setRecOpen(false)} className="adn-btn-secondary flex-1 py-2 text-sm">Cancelar</button>
                <button disabled={recBusy} className="adn-btn-primary flex-1 py-2 text-sm">
                  {recBusy ? "Enviando..." : "Enviar link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

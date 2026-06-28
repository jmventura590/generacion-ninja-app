import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, Save, Cake, Award, Gift, RefreshCw } from "lucide-react";
import { GIFT_SCENES, DEFAULT_MESSAGES } from "@/components/BirthdayCelebration";

export const Route = createFileRoute("/adn/settings")({
  component: SettingsView,
});

type BeltKey = "white" | "green" | "blue" | "red" | "black";
type BeltThresholds = Record<BeltKey, number>;

const DEFAULT_THRESHOLDS: BeltThresholds = { white: 11, green: 16, blue: 21, red: 26, black: 31 };

const BELT_META: { key: BeltKey; label: string; hex: string }[] = [
  { key: "white", label: "Blanca", hex: "#ffffff" },
  { key: "green", label: "Verde",  hex: "#39ff14" },
  { key: "blue",  label: "Azul",   hex: "#3aa0ff" },
  { key: "red",   label: "Roja",   hex: "#ff2d55" },
  { key: "black", label: "Negra",  hex: "#222222" },
];

function SettingsView() {
  const navigate = useNavigate();
  const [authChecked, setAuthChecked] = useState(false);
  const [isCoach, setIsCoach] = useState(false);

  const [messages, setMessages] = useState<string[]>(DEFAULT_MESSAGES);
  const [thresholds, setThresholds] = useState<BeltThresholds>(DEFAULT_THRESHOLDS);
  const [savingMsgs, setSavingMsgs] = useState(false);
  const [savingTh, setSavingTh] = useState(false);
  const [recomputing, setRecomputing] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/adn/auth" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      const coach = (roles ?? []).some((r: any) => r.role === "coach");
      setIsCoach(coach);
      setAuthChecked(true);
      if (!coach) return;

      const { data } = await (supabase.from as any)("app_settings").select("key,value");
      const map = new Map<string, any>((data ?? []).map((r: any) => [r.key, r.value]));
      const mArr = map.get("birthday_messages");
      if (Array.isArray(mArr) && mArr.length === 20) setMessages(mArr.map(String));
      const t = map.get("belt_thresholds");
      if (t && typeof t === "object") {
        setThresholds({
          white: Number(t.white ?? 11),
          green: Number(t.green ?? 16),
          blue:  Number(t.blue  ?? 21),
          red:   Number(t.red   ?? 26),
          black: Number(t.black ?? 31),
        });
      }
    })();
  }, [navigate]);

  async function saveMessages() {
    setSavingMsgs(true);
    try {
      const clean = messages.map((m) => m.trim()).filter(Boolean);
      if (clean.length !== 20) { toast.error("Tienen que ser 20 mensajes, sin vacíos."); return; }
      const { error } = await (supabase.from as any)("app_settings").upsert({ key: "birthday_messages", value: clean, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("Mensajes guardados.");
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar.");
    } finally { setSavingMsgs(false); }
  }

  async function saveThresholds() {
    setSavingTh(true);
    try {
      const vals = [thresholds.white, thresholds.green, thresholds.blue, thresholds.red, thresholds.black];
      if (vals.some((v) => !Number.isFinite(v) || v < 0 || v > 200)) {
        toast.error("Cada nivel debe ser un número entre 0 y 200."); return;
      }
      for (let i = 1; i < vals.length; i++) {
        if (vals[i] <= vals[i - 1]) { toast.error("Los niveles deben ir en orden creciente (Blanca < Verde < Azul < Roja < Negra)."); return; }
      }
      const { error } = await (supabase.from as any)("app_settings").upsert({ key: "belt_thresholds", value: thresholds, updated_at: new Date().toISOString() });
      if (error) throw error;
      toast.success("Umbrales actualizados. Recalculando…");
      await recomputeAll();
    } catch (e: any) {
      toast.error(e?.message ?? "No se pudo guardar.");
    } finally { setSavingTh(false); }
  }

  async function recomputeAll() {
    setRecomputing(true);
    try {
      const { data: ids } = await supabase.from("student_profiles").select("id");
      for (const r of (ids ?? []) as { id: string }[]) {
        await supabase.rpc("recompute_student_xp" as any, { _student_id: r.id });
      }
      toast.success(`Recalculado para ${ids?.length ?? 0} alumnos.`);
    } catch (e: any) {
      toast.error(e?.message ?? "Falló el recálculo.");
    } finally { setRecomputing(false); }
  }

  if (!authChecked) return <div className="p-10 text-center text-white/60">Verificando…</div>;
  if (!isCoach) return <div className="p-10 text-center text-white/60">Acceso solo para coaches.</div>;

  return (
    <div className="min-h-screen [padding-bottom:calc(8rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <Link to="/adn/coach" className="text-white/60 hover:text-white text-sm flex items-center gap-1"><ArrowLeft size={16}/>Panel</Link>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.4em] text-white/40">COACH</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">Configuración</span></h1>
        </div>
      </header>

      <section className="px-5 space-y-5">
        {/* Bloque 1: mensajes de cumpleaños */}
        <div className="adn-card p-5">
          <div className="flex items-center gap-2 mb-1"><Cake size={16} className="adn-fluor"/><div className="text-[10px] tracking-[0.3em] text-white/50">1 · MENSAJES DE CUMPLEAÑOS (20)</div></div>
          <p className="text-xs text-white/50 mb-3">Editá cualquiera de los 20 mensajes. Se sortea uno al azar el día del cumple del alumno.</p>
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className="flex gap-2">
                <span className="text-[10px] adn-fluor w-6 pt-2 text-right">{i + 1}.</span>
                <textarea
                  className="adn-input flex-1 text-sm"
                  rows={2}
                  value={m}
                  onChange={(e) => setMessages((arr) => arr.map((x, j) => j === i ? e.target.value : x))}
                />
              </div>
            ))}
          </div>
          <button onClick={saveMessages} disabled={savingMsgs} className="adn-btn-primary mt-4 px-5 py-2 text-xs flex items-center gap-2">
            <Save size={14}/>{savingMsgs ? "Guardando…" : "Guardar mensajes"}
          </button>
        </div>

        {/* Bloque 2: umbrales de muñequera */}
        <div className="adn-card p-5">
          <div className="flex items-center gap-2 mb-1"><Award size={16} className="adn-fluor"/><div className="text-[10px] tracking-[0.3em] text-white/50">2 · ESCALA DE COLORES DE MUÑEQUERA</div></div>
          <p className="text-xs text-white/50 mb-3">Nivel mínimo (curva XP) en el que se desbloquea cada color. Al guardar se recalculan todos los alumnos.</p>
          <div className="space-y-2">
            {BELT_META.map((b) => (
              <div key={b.key} className="flex items-center gap-3">
                <span className="h-6 w-6 rounded-full border border-white/20" style={{ background: b.hex, boxShadow: `0 0 10px ${b.hex}66` }} />
                <div className="flex-1 text-sm font-bold">Muñequera {b.label}</div>
                <input
                  type="number" min={0} max={200}
                  className="adn-input w-24 text-center"
                  value={thresholds[b.key]}
                  onChange={(e) => setThresholds((t) => ({ ...t, [b.key]: Number(e.target.value) }))}
                />
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={saveThresholds} disabled={savingTh} className="adn-btn-primary px-5 py-2 text-xs flex items-center gap-2">
              <Save size={14}/>{savingTh ? "Guardando…" : "Guardar y recalcular"}
            </button>
            <button onClick={recomputeAll} disabled={recomputing} className="adn-btn-secondary px-4 py-2 text-xs flex items-center gap-2 border border-white/15 rounded-lg">
              <RefreshCw size={14} className={recomputing ? "animate-spin" : ""}/>Recalcular alumnos
            </button>
          </div>
          <p className="text-[10px] text-white/40 mt-2">El cálculo real usa <code>public.belt_for_xp()</code> contra estos umbrales.</p>
        </div>

        {/* Bloque 3: regalos (solo lectura) */}
        <div className="adn-card p-5">
          <div className="flex items-center gap-2 mb-1"><Gift size={16} className="adn-fluor"/><div className="text-[10px] tracking-[0.3em] text-white/50">3 · REGALOS DE CUMPLEAÑOS ({GIFT_SCENES.length})</div></div>
          <p className="text-xs text-white/50 mb-3">Una de estas escenas se sortea al azar cuando se activa el festejo. Solo lectura por ahora.</p>
          <div className="grid grid-cols-4 gap-3">
            {GIFT_SCENES.map((g) => (
              <div key={g.label} className="rounded-xl border border-white/10 bg-black/40 p-2 flex flex-col items-center">
                <img src={g.img} alt={g.label} width={120} height={120} loading="lazy" className="w-full aspect-square object-contain"/>
                <div className="text-[10px] text-white/70 mt-1 text-center leading-tight">{g.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

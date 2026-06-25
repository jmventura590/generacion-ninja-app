import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, BarChart3, Map, Store } from "lucide-react";
import { BELTS, beltFromXp, OBSTACLES, SKILLS, type SkillKey } from "@/lib/adn-game";

export const Route = createFileRoute("/adn/student")({
  component: StudentDashboard,
});

type Student = { id: string; student_name: string; age: number | null; total_xp: number; current_belt_color: string };
type Skills = Record<SkillKey, number>;
type AvatarCfg = { hair: number; skin: number; accessory: number };

const TABS = [
  { key: "avatar", label: "Avatar",   Icon: User },
  { key: "evo",    label: "Evolución",Icon: BarChart3 },
  { key: "map",    label: "Mapa",     Icon: Map },
  { key: "shop",   label: "Shop",     Icon: Store },
] as const;
type TabKey = (typeof TABS)[number]["key"];

function StudentDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("evo");
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skills | null>(null);
  const [avatar, setAvatar] = useState<AvatarCfg>({ hair: 0, skin: 1, accessory: 0 });

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/adn/auth" }); return; }
      const { data: s } = await supabase.from("student_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!s) { toast.error("No hay alumno asociado a tu cuenta."); return; }
      setStudent(s as Student);
      const { data: sk } = await supabase.from("skill_bars").select("*").eq("student_id", s.id).maybeSingle();
      if (sk) setSkills(sk as any);
      const { data: av } = await supabase.from("avatars").select("skin, hair_color").eq("student_id", s.id).maybeSingle();
      if (av) {
        const skinIdx = Math.max(0, SKINS.indexOf(av.skin));
        const hairIdx = Math.max(0, HAIRS.indexOf(av.hair_color));
        setAvatar({ skin: skinIdx, hair: hairIdx, accessory: 0 });
      }
    })();
  }, [navigate]);

  async function saveAvatar(cfg: AvatarCfg) {
    setAvatar(cfg);
    if (!student) return;
    await supabase.from("avatars").upsert(
      { student_id: student.id, skin: SKINS[cfg.skin], hair_color: HAIRS[cfg.hair], hair: "default", gender: "neutral" },
      { onConflict: "student_id" },
    );
  }


  async function logout() { await supabase.auth.signOut(); navigate({ to: "/adn/auth" }); }

  if (!student || !skills) return <div className="p-10 text-center text-white/60">Cargando...</div>;

  const belt = beltFromXp(student.total_xp);

  return (
    <div className="min-h-screen pb-24">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-white/40">FAMILIA</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">{student.student_name.toUpperCase()}</span></h1>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><LogOut size={16}/>Salir</button>
      </header>

      <main className="px-5 mt-4">
        {tab === "avatar" && <AvatarStudio cfg={avatar} onSave={saveAvatar} />}
        {tab === "evo"    && <Evolution student={student} skills={skills} belt={belt} />}
        {tab === "map"    && <ObstacleMap skills={skills} />}
        {tab === "shop"   && <Shop />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-4 bg-black/95 border-t border-white/10 backdrop-blur">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex flex-col items-center gap-1 py-3 text-[10px] tracking-widest ${tab === key ? "adn-fluor" : "text-white/50"}`}>
            <Icon size={20} />
            {label.toUpperCase()}
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ─── Avatar Studio ─────────────────────────── */
const SKINS  = ["#f7d4b3", "#e2b08a", "#b88357", "#7e4f2a"];
const HAIRS  = ["#1b1b1b", "#6b3a1d", "#caa15a", "#df00ff"];
const ACCS   = ["none", "cap", "headband"];

function AvatarStudio({ cfg, onSave }: { cfg: AvatarCfg; onSave: (c: AvatarCfg) => void }) {
  return (
    <div className="space-y-5">
      <div className="adn-card p-5 flex flex-col items-center">
        <AvatarSVG cfg={cfg} size={180} />
        <p className="mt-3 text-xs text-white/50">Camiseta oficial ADN — verde fluor con detalles violetas.</p>
      </div>
      <div className="adn-card p-5 space-y-4">
        <Selector label="Piel" value={cfg.skin} onChange={(i) => onSave({ ...cfg, skin: i })}
          options={SKINS.map((c) => ({ swatch: c }))} />
        <Selector label="Pelo" value={cfg.hair} onChange={(i) => onSave({ ...cfg, hair: i })}
          options={HAIRS.map((c) => ({ swatch: c }))} />
        <Selector label="Accesorio" value={cfg.accessory} onChange={(i) => onSave({ ...cfg, accessory: i })}
          options={ACCS.map((c) => ({ label: c }))} />
      </div>
    </div>
  );
}

function Selector({ label, value, onChange, options }: {
  label: string; value: number; onChange: (i: number) => void;
  options: { swatch?: string; label?: string }[];
}) {
  return (
    <div>
      <div className="text-[10px] tracking-[0.3em] text-white/50 mb-2">{label.toUpperCase()}</div>
      <div className="flex gap-2 flex-wrap">
        {options.map((o, i) => (
          <button key={i} onClick={() => onChange(i)}
            className={`h-10 min-w-10 rounded-lg border-2 px-2 text-xs font-bold ${i === value ? "border-[var(--adn-fluor)]" : "border-white/15"}`}
            style={o.swatch ? { background: o.swatch } : {}}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function AvatarSVG({ cfg, size = 120 }: { cfg: AvatarCfg; size?: number }) {
  const skin = SKINS[cfg.skin] ?? SKINS[0];
  const hair = HAIRS[cfg.hair] ?? HAIRS[0];
  const acc  = ACCS[cfg.accessory];
  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label="avatar">
      <defs>
        <radialGradient id="bgG"><stop offset="0%" stopColor="#39ff14" stopOpacity=".35"/><stop offset="100%" stopColor="#000" stopOpacity="0"/></radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#bgG)" />
      {/* shirt */}
      <path d="M40 195 L60 130 Q100 120 140 130 L160 195 Z" fill="#39ff14" stroke="#df00ff" strokeWidth="3"/>
      {/* neck */}
      <rect x="88" y="105" width="24" height="20" fill={skin}/>
      {/* head */}
      <circle cx="100" cy="80" r="35" fill={skin} stroke="#000" strokeWidth="2"/>
      {/* hair */}
      <path d="M65 75 Q100 30 135 75 Q130 55 100 50 Q70 55 65 75 Z" fill={hair}/>
      {acc === "cap" && <path d="M62 70 Q100 38 138 70 L138 78 L62 78 Z" fill="#df00ff"/>}
      {acc === "headband" && <rect x="62" y="70" width="76" height="8" fill="#df00ff"/>}
      {/* eyes */}
      <circle cx="88" cy="85" r="3" fill="#0a0a0d"/>
      <circle cx="112" cy="85" r="3" fill="#0a0a0d"/>
      {/* smile */}
      <path d="M88 98 Q100 108 112 98" stroke="#0a0a0d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      {/* ADN badge */}
      <rect x="92" y="150" width="16" height="10" rx="2" fill="#000"/>
      <text x="100" y="158" textAnchor="middle" fontSize="7" fill="#39ff14" fontWeight="900">ADN</text>
    </svg>
  );
}

/* ─── Evolution ─────────────────────────── */
function Evolution({ student, skills, belt }: { student: Student; skills: Skills; belt: ReturnType<typeof beltFromXp> }) {
  const beltLabel = BELTS.find((b) => b.key === student.current_belt_color)?.label ?? belt.current.label;
  return (
    <div className="space-y-5">
      <div className="adn-card p-5">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-full border-4" style={{ borderColor: belt.current.hex, boxShadow: `0 0 18px ${belt.current.hex}88` }} />
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/50">RANGO ACTUAL</div>
            <div className="text-xl font-black">{beltLabel}</div>
            <div className="text-xs text-white/60">{belt.current.subtitle} · {student.total_xp} XP</div>
          </div>
        </div>
        {belt.next && (
          <div className="mt-4">
            <div className="flex justify-between text-[11px] text-white/50 mb-1">
              <span>Hacia {belt.next.label}</span><span>{Math.round(belt.pct)}%</span>
            </div>
            <div className="h-3 bg-white/5 rounded-full overflow-hidden">
              <div className="adn-bar-fill" style={{ width: `${belt.pct}%` }} />
            </div>
            <div className="mt-1 text-[10px] text-white/40">Faltan {belt.next.min - student.total_xp} XP</div>
          </div>
        )}
      </div>

      <div className="adn-card p-5">
        <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">CAPACIDADES</div>
        <div className="space-y-3">
          {SKILLS.map(({ key, label }) => {
            const v = skills[key] ?? 0;
            const pct = Math.min(100, (v / 500) * 100);
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">{label}</span>
                  <span className="text-white/50">{v} XP</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="adn-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Obstacle Map ─────────────────────────── */
function ObstacleMap({ skills }: { skills: Skills }) {
  return (
    <div className="space-y-4">
      <div className="text-[10px] tracking-[0.3em] text-white/50 px-1">MAPA DE OBSTÁCULOS</div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {OBSTACLES.map((o) => {
          const xp = skills[o.unlockSkill] ?? 0;
          const unlocked = xp >= o.unlockAt;
          const pct = Math.min(100, (xp / o.unlockAt) * 100);
          return (
            <div key={o.name} className={`adn-card p-4 ${unlocked ? "adn-unlocked" : ""}`}>
              <div className="aspect-square w-full overflow-hidden rounded-xl bg-black/60">
                <img src={o.img} alt={o.name} loading="lazy" width={768} height={768}
                  className={`w-full h-full object-contain ${unlocked ? "" : "adn-locked"}`} />
              </div>
              <div className="mt-3 flex items-center justify-between">
                <div className="font-black">{o.name}</div>
                <div className={`text-[10px] font-bold ${unlocked ? "adn-fluor" : "text-white/40"}`}>{unlocked ? "DESTRABADO" : "BLOQUEADO"}</div>
              </div>
              <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
                <div className="adn-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              {unlocked ? (
                <button className="adn-btn-primary w-full mt-3 py-2.5 text-[11px]">¡Obstáculo Destrabado! Pedí tu Pin real en el mostrador</button>
              ) : (
                <p className="mt-3 text-[11px] text-white/50">Faltan {o.unlockAt - xp} XP de {o.unlockSkill.replace("_xp","")} para desbloquear.</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Shop ─────────────────────────── */
function Shop() {
  return (
    <div className="space-y-4">
      <div className="text-[10px] tracking-[0.3em] text-white/50 px-1">ADN SHOP · MOSTRADOR</div>
      <div className="adn-card p-4">
        <div className="text-sm font-bold mb-3">Muñequeras de silicona</div>
        <div className="flex gap-3 flex-wrap">
          {BELTS.map((b) => (
            <div key={b.key} className="flex flex-col items-center text-[11px]">
              <div className="h-12 w-12 rounded-full border-4" style={{ borderColor: b.hex, boxShadow: `0 0 12px ${b.hex}77` }} />
              <span className="mt-1 text-white/70">{b.label.replace("Muñequera ", "")}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="adn-card p-4">
        <div className="text-sm font-bold mb-3">Pins metálicos de obstáculos</div>
        <div className="grid grid-cols-3 gap-3">
          {OBSTACLES.map((o) => (
            <div key={o.name} className="text-center">
              <div className="aspect-square rounded-xl bg-black/60 p-2 border border-white/10">
                <img src={o.img} alt={o.name} loading="lazy" width={768} height={768} className="w-full h-full object-contain" />
              </div>
              <div className="mt-1 text-[11px] text-white/70">{o.name}</div>
            </div>
          ))}
        </div>
      </div>
      <p className="text-[11px] text-white/50 text-center px-4">
        Optional badges to celebrate your real-world effort and consistency.
      </p>
    </div>
  );
}

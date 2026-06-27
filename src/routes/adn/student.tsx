import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, BarChart3, Map, Check } from "lucide-react";
import { BELTS, beltFromXp, OBSTACLES, SKILLS, type SkillKey } from "@/lib/adn-game";
import adnLogo from "@/assets/adn-logo.jpg";

export const Route = createFileRoute("/adn/student")({
  component: StudentDashboard,
});

type Student = { id: string; student_name: string; age: number | null; total_xp: number; current_belt_color: string };
type Skills = Record<SkillKey, number>;

const TABS = [
  { key: "avatar", label: "Avatar",   Icon: User },
  { key: "evo",    label: "Evolución",Icon: BarChart3 },
  { key: "map",    label: "Mapa",     Icon: Map },
] as const;
type TabKey = (typeof TABS)[number]["key"];

/* ─── Avatar Presets ───────────────────────────
 * 10 avatares (5 nenes + 5 nenas), 6-14 años.
 * Variación de piel, color de pelo y peinado (lacio, rulos, trenzas, gorra).
 * Todos visten remera negra con logo ADN blanco en el pecho.
 */
type Gender = "boy" | "girl";
type HairStyle = "short" | "curly" | "long" | "braids" | "spiky" | "ponytail" | "buzz" | "bun" | "wavy" | "sideswept";
type AvatarPreset = {
  id: string;
  gender: Gender;
  skin: string;
  hairColor: string;
  style: HairStyle;
};

// 10 nenes/nenas (6-14 años), looks variados y realistas.
// Solo 1 rapado (b3). Sin gorra. Pelos en tonos naturales.
const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "b1", gender: "boy",  skin: "#f7d4b3", hairColor: "#3a1f0e", style: "short"     }, // castaño corto, piel clara
  { id: "b2", gender: "boy",  skin: "#e2b08a", hairColor: "#1b1b1b", style: "curly"     }, // rulos negros
  { id: "b3", gender: "boy",  skin: "#b88357", hairColor: "#0a0a0a", style: "buzz"      }, // único rapado
  { id: "b4", gender: "boy",  skin: "#d9a274", hairColor: "#5a2d10", style: "spiky"     }, // pelo parado castaño
  { id: "b5", gender: "boy",  skin: "#f0c8a0", hairColor: "#caa15a", style: "sideswept" }, // rubio peinado al costado
  { id: "g1", gender: "girl", skin: "#f7d4b3", hairColor: "#a86b3a", style: "long"      }, // pelo largo castaño claro
  { id: "g2", gender: "girl", skin: "#c89373", hairColor: "#2a1608", style: "braids"    }, // trenzas oscuras
  { id: "g3", gender: "girl", skin: "#b88357", hairColor: "#1b1b1b", style: "ponytail"  }, // colita negra
  { id: "g4", gender: "girl", skin: "#7e4f2a", hairColor: "#0a0a0a", style: "bun"       }, // rodete negro
  { id: "g5", gender: "girl", skin: "#f0c8a0", hairColor: "#b8341f", style: "wavy"      }, // pelirroja ondulada
];

function StudentDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("evo");
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skills | null>(null);
  const [avatarId, setAvatarId] = useState<string>("b1");
  const [celebrate, setCelebrate] = useState<null | { beltKey: string; beltLabel: string }>(null);
  const prevBeltRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/adn/auth" }); return; }
      const { data: s } = await supabase.from("student_profiles").select("*").eq("user_id", session.user.id).maybeSingle();
      if (!s) { toast.error("No hay alumno asociado a tu cuenta."); return; }
      const stu = s as Student;
      setStudent(stu);
      const { data: sk } = await supabase.from("skill_bars").select("*").eq("student_id", stu.id).maybeSingle();
      if (sk) setSkills(sk as any);
      const { data: av } = await supabase.from("avatars").select("hair, gender, skin, hair_color").eq("student_id", stu.id).maybeSingle();
      if (av?.hair && AVATAR_PRESETS.some((p) => p.id === av.hair)) setAvatarId(av.hair);

      // Detect belt-up vs locally-stored previous belt
      const storageKey = `adn:lastBelt:${stu.id}`;
      const lastSeen = localStorage.getItem(storageKey);
      prevBeltRef.current = lastSeen;
      if (lastSeen && lastSeen !== stu.current_belt_color) {
        const belt = BELTS.find((b) => b.key === stu.current_belt_color);
        if (belt && BELTS.findIndex((b) => b.key === stu.current_belt_color) > BELTS.findIndex((b) => b.key === (lastSeen as any))) {
          setCelebrate({ beltKey: belt.key, beltLabel: belt.label });
        }
      }
      localStorage.setItem(storageKey, stu.current_belt_color);
    })();
  }, [navigate]);

  async function selectAvatar(id: string) {
    setAvatarId(id);
    if (!student) return;
    const preset = AVATAR_PRESETS.find((p) => p.id === id)!;
    await supabase.from("avatars").upsert(
      { student_id: student.id, hair: preset.id, gender: preset.gender, skin: preset.skin, hair_color: preset.hairColor },
      { onConflict: "student_id" },
    );
  }

  async function logout() { await supabase.auth.signOut(); navigate({ to: "/adn/auth" }); }

  if (!student || !skills) return <div className="p-10 text-center text-white/60">Cargando...</div>;

  const belt = beltFromXp(student.total_xp);
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) ?? AVATAR_PRESETS[0];

  return (
    <div className="min-h-screen pb-32 [padding-bottom:calc(8rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-white/40">FAMILIA</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">{student.student_name.toUpperCase()}</span></h1>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><LogOut size={16}/>Salir</button>
      </header>

      <main className="px-5 mt-4">
        {tab === "avatar" && <AvatarStudio selectedId={avatarId} onSelect={selectAvatar} />}
        {tab === "evo"    && <Evolution student={student} skills={skills} belt={belt} />}
        {tab === "map"    && <ObstacleMap skills={skills} />}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 grid grid-cols-3 bg-black/95 border-t border-white/10 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {TABS.map(({ key, label, Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex flex-col items-center gap-1 py-3 text-[10px] tracking-widest ${tab === key ? "adn-fluor" : "text-white/50"}`}>
            <Icon size={20} />
            {label.toUpperCase()}
          </button>
        ))}
      </nav>

      {celebrate && (
        <LevelUpCelebration
          preset={preset}
          beltLabel={celebrate.beltLabel}
          onClose={() => setCelebrate(null)}
        />
      )}
    </div>
  );
}

/* ─── Avatar Studio ─────────────────────────── */
function AvatarStudio({ selectedId, onSelect }: { selectedId: string; onSelect: (id: string) => void }) {
  const selected = AVATAR_PRESETS.find((p) => p.id === selectedId) ?? AVATAR_PRESETS[0];
  return (
    <div className="space-y-5">
      <div className="adn-card p-5 flex flex-col items-center">
        <AvatarSVG preset={selected} size={180} cheering={false} />
        <p className="mt-3 text-xs text-white/50 text-center">Remera negra oficial ADN — elegí tu personaje favorito.</p>
      </div>
      <div className="adn-card p-5">
        <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">GALERÍA · 10 PERSONAJES</div>
        <div className="grid grid-cols-5 gap-2.5">
          {AVATAR_PRESETS.map((p) => {
            const active = p.id === selectedId;
            return (
              <button key={p.id} onClick={() => onSelect(p.id)}
                className={`relative aspect-square rounded-xl border-2 p-1 transition ${active ? "border-[var(--adn-fluor)] bg-[#39ff14]/10" : "border-white/10 bg-black/40 hover:border-white/30"}`}>
                <AvatarSVG preset={p} size={64} cheering={false} />
                {active && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[var(--adn-fluor)] text-black grid place-items-center shadow-[0_0_12px_#39ff14]">
                    <Check size={12} strokeWidth={3}/>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Avatar SVG ─────────────────────────── */
function AvatarSVG({ preset, size = 120, cheering = false }: { preset: AvatarPreset; size?: number; cheering?: boolean }) {
  const { skin, hairColor, style, gender } = preset;
  const armPose = cheering ? (
    <>
      {/* both arms up — victory */}
      <path d="M62 135 L40 70" stroke={skin} strokeWidth="12" strokeLinecap="round"/>
      <path d="M138 135 L160 70" stroke={skin} strokeWidth="12" strokeLinecap="round"/>
      <circle cx="40" cy="65" r="8" fill={skin}/>
      <circle cx="160" cy="65" r="8" fill={skin}/>
    </>
  ) : (
    <>
      {/* action pose — one arm grabbing up (climbing), other pulling back */}
      <path d="M138 132 Q160 100 150 60" stroke={skin} strokeWidth="12" strokeLinecap="round" fill="none"/>
      <circle cx="150" cy="56" r="9" fill={skin}/>
      <path d="M62 132 Q40 150 46 178" stroke={skin} strokeWidth="12" strokeLinecap="round" fill="none"/>
      <circle cx="46" cy="180" r="8" fill={skin}/>
    </>
  );

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" aria-label={`avatar ${preset.id}`}>
      <defs>
        <radialGradient id={`bgG-${preset.id}`}>
          <stop offset="0%"   stopColor="#39ff14" stopOpacity=".28"/>
          <stop offset="100%" stopColor="#000"    stopOpacity="0"/>
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill={`url(#bgG-${preset.id})`} />

      {/* arms (behind shirt) */}
      {armPose}

      {/* shirt — negro liso con "ADN" blanco inline */}
      <path d="M44 198 L60 130 Q100 120 140 130 L156 198 Z" fill="#000" stroke="#000" strokeWidth="2"/>
      <text x="100" y="168" textAnchor="middle" fontSize="22" fontWeight="900" fill="#ffffff" letterSpacing="1.5" fontFamily="system-ui, -apple-system, sans-serif">ADN</text>


      {/* neck */}
      <rect x="90" y="108" width="20" height="18" fill={skin}/>

      {/* head */}
      <circle cx="100" cy="80" r="33" fill={skin} stroke="#000" strokeWidth="1.5"/>


      {/* hair by style */}
      {style === "short"    && <path d="M68 76 Q100 32 132 76 Q126 56 100 52 Q74 56 68 76 Z" fill={hairColor}/>}
      {style === "curly"    && (
        <g fill={hairColor}>
          <circle cx="75"  cy="60" r="11"/><circle cx="90"  cy="50" r="12"/>
          <circle cx="105" cy="48" r="12"/><circle cx="120" cy="52" r="11"/>
          <circle cx="128" cy="65" r="10"/><circle cx="70"  cy="72" r="9"/>
        </g>
      )}
      {style === "buzz"     && <path d="M70 78 Q100 56 130 78 Q128 66 100 62 Q72 66 70 78 Z" fill={hairColor} opacity=".85"/>}
      {style === "spiky"    && (
        <g fill={hairColor}>
          <path d="M68 78 Q100 60 132 78 Q126 62 100 58 Q74 62 68 78 Z"/>
          <path d="M72 60 L80 78 L86 58 L94 78 L100 54 L106 78 L114 58 L120 78 L128 60 L124 78 L76 78 Z"/>
        </g>
      )}
      {style === "sideswept" && (
        <>
          <path d="M68 78 Q100 38 132 78 Q126 58 100 54 Q74 58 68 78 Z" fill={hairColor}/>
          <path d="M70 70 Q90 48 132 60 Q120 72 96 74 Q80 76 70 78 Z" fill={hairColor}/>
        </>
      )}
      {style === "wavy"     && (
        <>
          <path d="M62 80 Q66 110 74 130 L66 132 Q56 110 58 82 Z" fill={hairColor}/>
          <path d="M138 80 Q134 110 126 130 L134 132 Q144 110 142 82 Z" fill={hairColor}/>
          <path d="M65 76 Q100 34 135 76 Q130 54 100 50 Q70 54 65 76 Z" fill={hairColor}/>
          <path d="M70 80 Q85 92 75 105 Q92 96 88 84 Z" fill={hairColor} opacity=".7"/>
        </>
      )}
      {style === "long"     && (
        <>
          <path d="M62 78 Q70 130 78 150 L70 152 Q56 120 60 80 Z" fill={hairColor}/>
          <path d="M138 78 Q130 130 122 150 L130 152 Q144 120 140 80 Z" fill={hairColor}/>
          <path d="M65 72 Q100 30 135 72 Q130 50 100 48 Q70 50 65 72 Z" fill={hairColor}/>
        </>
      )}
      {style === "braids"   && (
        <>
          <path d="M65 72 Q100 30 135 72 Q130 50 100 48 Q70 50 65 72 Z" fill={hairColor}/>
          <g fill={hairColor}>
            <ellipse cx="62" cy="100" rx="8" ry="14"/>
            <ellipse cx="62" cy="125" rx="7" ry="12"/>
            <ellipse cx="138" cy="100" rx="8" ry="14"/>
            <ellipse cx="138" cy="125" rx="7" ry="12"/>
          </g>
          <circle cx="62" cy="140" r="4" fill="#df00ff"/>
          <circle cx="138" cy="140" r="4" fill="#df00ff"/>
        </>
      )}
      {style === "ponytail" && (
        <>
          <path d="M65 72 Q100 30 135 72 Q130 50 100 48 Q70 50 65 72 Z" fill={hairColor}/>
          <path d="M135 80 Q170 100 162 140 Q155 120 145 110 Z" fill={hairColor}/>
        </>
      )}
      {style === "bun"      && (
        <>
          <path d="M68 78 Q100 38 132 78 Q126 58 100 54 Q74 58 68 78 Z" fill={hairColor}/>
          <circle cx="100" cy="42" r="14" fill={hairColor}/>
          <circle cx="100" cy="42" r="14" fill="none" stroke="#000" strokeOpacity=".2" strokeWidth="1"/>
        </>
      )}

      {/* eyes */}
      <circle cx="88"  cy="86" r="3" fill="#0a0a0d"/>
      <circle cx="112" cy="86" r="3" fill="#0a0a0d"/>
      {/* smile */}
      <path d={cheering ? "M86 96 Q100 112 114 96" : "M88 98 Q100 106 112 98"} stroke="#0a0a0d" strokeWidth="2.5" fill="none" strokeLinecap="round"/>

      {/* girl earrings hint */}
      {gender === "girl" && (
        <>
          <circle cx="67" cy="92" r="2" fill="#df00ff"/>
          <circle cx="133" cy="92" r="2" fill="#df00ff"/>
        </>
      )}
    </svg>
  );
}

/* ─── Level Up Celebration ─────────────────── */
function LevelUpCelebration({ preset, beltLabel, onClose }: { preset: AvatarPreset; beltLabel: string; onClose: () => void }) {
  useEffect(() => {
    const colors = ["#39ff14", "#df00ff", "#ffffff", "#00ffae"];
    const end = Date.now() + 2500;
    const tick = () => {
      confetti({ particleCount: 5, angle: 60,  spread: 70, startVelocity: 55, origin: { x: 0,   y: 0.8 }, colors });
      confetti({ particleCount: 5, angle: 120, spread: 70, startVelocity: 55, origin: { x: 1,   y: 0.8 }, colors });
      confetti({ particleCount: 3, spread: 360, startVelocity: 25, origin: { x: 0.5, y: 0.4 }, colors, scalar: 0.9 });
      if (Date.now() < end) requestAnimationFrame(tick);
    };
    tick();
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-6 animate-fade-in">
      <div className="text-[11px] tracking-[0.5em] text-white/60">SUBISTE DE NIVEL</div>
      <h2 className="mt-2 text-3xl font-black text-center adn-fluor" style={{ fontFamily: "Orbitron, sans-serif" }}>¡{beltLabel}!</h2>

      <div className="relative mt-6">
        {/* Neon aura */}
        <div className="absolute inset-0 rounded-full blur-3xl opacity-80 animate-pulse"
             style={{ background: "radial-gradient(circle, #39ff14 0%, #df00ff 60%, transparent 75%)" }} />
        {/* Bouncing avatar */}
        <div className="relative animate-bounce">
          <AvatarSVG preset={preset} size={240} cheering />
        </div>
      </div>

      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        Tu constancia rinde frutos. ¡Seguí entrenando, ninja!
      </p>
      <button onClick={onClose} className="adn-btn-primary mt-6 px-8 py-3 text-sm">
        SEGUIR
      </button>
    </div>
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
            <div className="mt-1 text-[10px] text-white/40">Nivel {belt.level} → {belt.next.label}</div>
          </div>
        )}
      </div>

      <div className="adn-card p-5">
        <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">HABILIDADES</div>
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


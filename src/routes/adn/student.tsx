import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, BarChart3, Map, Check } from "lucide-react";
import { BELTS, beltFromXp, OBSTACLES, SKILLS, type SkillKey } from "@/lib/adn-game";


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
 * 10 ilustraciones (5 nenes + 5 nenas), estilo marcador a mano igual al Mapa.
 * Cada PNG tiene remera negra LISA; el logo ADN real se superpone vía <img>
 * con mix-blend-mode: screen para que la silueta blanca aparezca impresa.
 */
import avB1 from "@/assets/avatars/b1.png";
import avB2 from "@/assets/avatars/b2.png";
import avB3 from "@/assets/avatars/b3.png";
import avB4 from "@/assets/avatars/b4.png";
import avB5 from "@/assets/avatars/b5.png";
import avG1 from "@/assets/avatars/g1.png";
import avG2 from "@/assets/avatars/g2.png";
import avG3 from "@/assets/avatars/g3.png";
import avG4 from "@/assets/avatars/g4.png";
import avG5 from "@/assets/avatars/g5.png";

type Gender = "boy" | "girl";
type AvatarPreset = {
  id: string;
  gender: Gender;
  img: string;
  label: string;
};

// 10 personajes únicos: el logo ADN ya está estampado en la remera de cada PNG
// con la profundidad correcta (los brazos/pelo que pasan delante del torso
// tapan el logo igual que taparían la tela real).
const AVATAR_PRESETS: AvatarPreset[] = [
  { id: "b1", gender: "boy",  img: avB1, label: "Saludo" },
  { id: "b2", gender: "boy",  img: avB2, label: "Pulgar arriba" },
  { id: "b3", gender: "boy",  img: avB3, label: "Brazos cruzados" },
  { id: "b4", gender: "boy",  img: avB4, label: "Fist pump" },
  { id: "b5", gender: "boy",  img: avB5, label: "Confiado" },
  { id: "g1", gender: "girl", img: avG1, label: "Peace" },
  { id: "g2", gender: "girl", img: avG2, label: "OK" },
  { id: "g3", gender: "girl", img: avG3, label: "Salto en V" },
  { id: "g4", gender: "girl", img: avG4, label: "Trenzas" },
  { id: "g5", gender: "girl", img: avG5, label: "Festejo" },
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
      { student_id: student.id, hair: preset.id, gender: preset.gender, skin: "#000", hair_color: "#000" },
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
        <AvatarImage preset={selected} size={220} />
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
                <AvatarImage preset={p} size={72} />
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

/* ─── Avatar Image (PNG con logo ADN ya estampado) ─── */
function AvatarImage({ preset, size = 120 }: { preset: AvatarPreset; size?: number }) {
  return (
    <div
      className="relative mx-auto select-none"
      style={{ width: size, height: size }}
      aria-label={`avatar ${preset.id}`}
    >
      <img
        src={preset.img}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
      />
    </div>
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
          <AvatarImage preset={preset} size={240} />
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


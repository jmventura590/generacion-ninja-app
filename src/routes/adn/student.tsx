import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, BarChart3, Check, Lock, ArrowLeft } from "lucide-react";
import { BELTS, beltFromXp, SKILLS, type SkillKey } from "@/lib/adn-game";

export const Route = createFileRoute("/adn/student")({
  component: StudentDashboard,
});

type Student = { id: string; student_name: string; age: number | null; total_xp: number; current_belt_color: string; birth_date: string | null };
type Skills = Record<SkillKey, number>;

/* ─── Avatares (10 personajes base) ─── */
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
type AvatarPreset = { id: string; gender: Gender; img: string; label: string };

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

/* ─── Obstáculos del Medallero (nombres = class_types en DB) ─── */
import obMuro from "@/assets/obstacles/muro.png";
import obPasamanos from "@/assets/obstacles/pasamanos.png";
import obEscalera from "@/assets/obstacles/escalera.png";
import obEscalones from "@/assets/obstacles/escalones.png";
import obPalestra from "@/assets/obstacles/palestra.png";
import obPegboard from "@/assets/obstacles/pegboard.png";
import obPelotas from "@/assets/obstacles/pelotas.png";
import obTronco from "@/assets/obstacles/tronco.png";
import obPuente from "@/assets/obstacles/puente.png";
import { BirthdayCelebration } from "@/components/BirthdayCelebration";

const OBSTACLES: { name: string; img: string }[] = [
  { name: "Muro Curvado",      img: obMuro },
  { name: "Pasamanos",         img: obPasamanos },
  { name: "Escalera Invertida",img: obEscalera },
  { name: "5 Escalones",       img: obEscalones },
  { name: "Palestra",          img: obPalestra },
  { name: "Pegboard",          img: obPegboard },
  { name: "Pelotas Colgantes", img: obPelotas },
  { name: "Tronco Giratorio",  img: obTronco },
  { name: "Puente Colgante",   img: obPuente },
];

const UNLOCK_THRESHOLD = 1; // ≥1 asistencia con ese obstáculo = desbloqueado

/* ─── Accesorios de avatar por nivel ─── */
type CapVariant = "green" | "blue" | "red" | "gold";
type BgVariant = "neon" | "fire" | "cosmos";
type Accessories = {
  wristband: { color: string } | null; // L3+
  cap: CapVariant | null;              // L5, L10, L15, L20
  background: BgVariant | null;        // L8, L15, L20
};

function accessoriesForLevel(level: number, beltHex: string): Accessories {
  return {
    wristband: level >= 3 ? { color: beltHex } : null,
    cap:
      level >= 20 ? "gold" :
      level >= 15 ? "red"  :
      level >= 10 ? "blue" :
      level >= 5  ? "green" : null,
    background:
      level >= 20 ? "cosmos" :
      level >= 15 ? "fire"   :
      level >= 8  ? "neon"   : null,
  };
}

type TabKey = "medals" | "avatar" | "evo";

function StudentDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("medals");
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skills | null>(null);
  const [avatarId, setAvatarId] = useState<string>("b1");
  const [obstacleCounts, setObstacleCounts] = useState<Record<string, number>>({});
  const [celebrate, setCelebrate] = useState<null | { beltKey: string; beltLabel: string }>(null);
  const [birthday, setBirthday] = useState<null | { seed: string }>(null);
  const prevBeltRef = useRef<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/adn/auth" }); return; }
      const { data: s } = await supabase.from("student_profiles").select("*")
        .or(`user_id.eq.${session.user.id},family_user_id.eq.${session.user.id}`)
        .maybeSingle();
      if (!s) { toast.error("No hay alumno asociado a tu cuenta."); return; }
      const stu = s as Student;
      setStudent(stu);

      const { data: sk } = await supabase.from("skill_bars").select("*").eq("student_id", stu.id).maybeSingle();
      if (sk) setSkills(sk as any);

      const { data: av } = await supabase.from("avatars").select("hair").eq("student_id", stu.id).maybeSingle();
      if (av?.hair && AVATAR_PRESETS.some((p) => p.id === av.hair)) setAvatarId(av.hair);

      // Conteo real de asistencias por tipo de clase (obstáculo)
      const { data: logs } = await supabase
        .from("attendance_logs")
        .select("class_type_id, class_types(name)")
        .eq("student_id", stu.id);
      const counts: Record<string, number> = {};
      (logs ?? []).forEach((r: any) => {
        const n = r.class_types?.name;
        if (n) counts[n] = (counts[n] ?? 0) + 1;
      });
      setObstacleCounts(counts);

      // Detectar subida de muñequera
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

      // Cumpleaños: si hoy coincide día/mes con birth_date, mostrar 1 vez al año
      if (stu.birth_date) {
        const today = new Date();
        const [by, bm, bd] = stu.birth_date.split("-").map(Number);
        if (bm === today.getMonth() + 1 && bd === today.getDate()) {
          const year = today.getFullYear();
          const bdayKey = `adn:bday:${stu.id}:${year}`;
          if (!localStorage.getItem(bdayKey)) {
            setBirthday({ seed: `${stu.id}-${year}` });
            localStorage.setItem(bdayKey, "1");
          }
          void by;
        }
      }
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
  const accessories = accessoriesForLevel(belt.level, belt.current.hex);

  return (
    <div className="min-h-screen pb-6 [padding-bottom:calc(1.5rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pt-6 pb-2 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-white/40">FAMILIA</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">{student.student_name.toUpperCase()}</span></h1>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><LogOut size={16}/>Salir</button>
      </header>

      <main className="px-5 mt-4">
        {tab === "medals" && (
          <Medallero
            counts={obstacleCounts}
            onAvatar={() => setTab("avatar")}
            onEvo={() => setTab("evo")}
            belt={belt}
          />
        )}
        {tab === "avatar" && (
          <SubScreen title="Avatar" onBack={() => setTab("medals")}>
            <AvatarStudio selectedId={avatarId} onSelect={selectAvatar} accessories={accessories} level={belt.level} />
          </SubScreen>
        )}
        {tab === "evo" && (
          <SubScreen title="Evolución" onBack={() => setTab("medals")}>
            <Evolution student={student} skills={skills} belt={belt} />
          </SubScreen>
        )}
      </main>

      {celebrate && (
        <LevelUpCelebration
          preset={preset}
          accessories={accessories}
          beltLabel={celebrate.beltLabel}
          onClose={() => setCelebrate(null)}
        />
      )}

      {birthday && (
        <BirthdayCelebration
          studentName={student.student_name}
          seed={birthday.seed}
          onClose={() => setBirthday(null)}
        />
      )}
    </div>
  );
}

/* ─── SubScreen wrapper con botón Volver ─── */
function SubScreen({ title, onBack, children }: { title: string; onBack: () => void; children: React.ReactNode }) {
  return (
    <div>
      <button onClick={onBack} className="mb-3 flex items-center gap-1.5 text-xs text-white/60 hover:text-white">
        <ArrowLeft size={14}/> Volver al medallero
      </button>
      <div className="text-[10px] tracking-[0.4em] text-white/40 mb-3">{title.toUpperCase()}</div>
      {children}
    </div>
  );
}

/* ─── Medallero (pantalla principal) ─── */
function Medallero({
  counts, onAvatar, onEvo, belt,
}: {
  counts: Record<string, number>;
  onAvatar: () => void;
  onEvo: () => void;
  belt: ReturnType<typeof beltFromXp>;
}) {
  const unlockedCount = OBSTACLES.filter((o) => (counts[o.name] ?? 0) >= UNLOCK_THRESHOLD).length;
  return (
    <div className="space-y-5">
      <div className="adn-card p-4 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.3em] text-white/50">MEDALLERO</div>
          <div className="text-lg font-black">{unlockedCount} / {OBSTACLES.length} obstáculos</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] tracking-[0.3em] text-white/50">NIVEL</div>
          <div className="text-lg font-black adn-fluor">L{belt.level}</div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {OBSTACLES.map((o) => {
          const c = counts[o.name] ?? 0;
          const unlocked = c >= UNLOCK_THRESHOLD;
          return (
            <div
              key={o.name}
              className={`relative aspect-square rounded-2xl border p-2 flex flex-col items-center justify-between overflow-hidden ${
                unlocked
                  ? "bg-black/40 border-[var(--adn-fluor)]/50 shadow-[0_0_18px_#39ff1433]"
                  : "bg-black/30 border-white/10"
              }`}
            >
              <img
                src={o.img}
                alt={o.name}
                className={`w-full flex-1 object-contain ${unlocked ? "" : "blur-[4px] opacity-60"}`}
                draggable={false}
              />
              <div className="text-[9px] uppercase text-center text-white/70 leading-tight w-full px-1 truncate">
                {o.name}
              </div>
              <span
                className={`absolute top-1.5 right-1.5 h-6 w-6 rounded-full grid place-items-center ${
                  unlocked ? "bg-[var(--adn-fluor)] text-black shadow-[0_0_10px_#39ff14]" : "bg-white/10 text-white/60"
                }`}
              >
                {unlocked ? <Check size={13} strokeWidth={3}/> : <Lock size={12}/>}
              </span>
            </div>
          );
        })}
      </div>

      {/* Accesos: Avatar (izq) + Evolución (der) */}
      <div className="grid grid-cols-2 gap-3 pt-2">
        <button
          onClick={onAvatar}
          className="adn-card p-5 flex flex-col items-center gap-2 hover:border-[var(--adn-fluor)]/60 transition"
        >
          <User size={28} className="adn-fluor"/>
          <div className="text-xs tracking-[0.3em] font-bold">AVATAR</div>
        </button>
        <button
          onClick={onEvo}
          className="adn-card p-5 flex flex-col items-center gap-2 hover:border-[var(--adn-fluor)]/60 transition"
        >
          <BarChart3 size={28} className="adn-fluor"/>
          <div className="text-xs tracking-[0.3em] font-bold">EVOLUCIÓN</div>
        </button>
      </div>
    </div>
  );
}

/* ─── Avatar Studio ─── */
function AvatarStudio({
  selectedId, onSelect, accessories, level,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  accessories: Accessories;
  level: number;
}) {
  const selected = AVATAR_PRESETS.find((p) => p.id === selectedId) ?? AVATAR_PRESETS[0];
  return (
    <div className="space-y-5">
      <div className="adn-card p-5 flex flex-col items-center">
        <AvatarImage preset={selected} size={240} accessories={accessories} />
        <p className="mt-3 text-xs text-white/50 text-center">
          Tu avatar luce los accesorios desbloqueados hasta el nivel actual.
        </p>
        <AccessoriesLegend accessories={accessories} level={level} />
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

function AccessoriesLegend({ accessories, level }: { accessories: Accessories; level: number }) {
  const items: { unlocked: boolean; label: string; at: number }[] = [
    { unlocked: !!accessories.wristband, label: "Muñequera",  at: 3 },
    { unlocked: !!accessories.cap,        label: "Gorro",      at: 5 },
    { unlocked: !!accessories.background, label: "Escenario",  at: 8 },
  ];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2 w-full">
      {items.map((it) => (
        <div key={it.label} className={`rounded-lg p-2 text-center border ${it.unlocked ? "border-[var(--adn-fluor)]/50 bg-[#39ff14]/5" : "border-white/10 bg-black/30 opacity-60"}`}>
          <div className="text-[9px] tracking-widest text-white/60">{it.label.toUpperCase()}</div>
          <div className={`text-[10px] mt-0.5 ${it.unlocked ? "adn-fluor" : "text-white/50"}`}>
            {it.unlocked ? "Equipado" : `Nivel ${it.at}`}
          </div>
        </div>
      ))}
      <div className="col-span-3 text-[10px] text-white/40 text-center mt-1">Nivel actual: L{level}</div>
    </div>
  );
}

/* ─── Avatar Image con capas de accesorios ─── */
function AvatarImage({
  preset, size = 120, accessories,
}: {
  preset: AvatarPreset;
  size?: number;
  accessories?: Accessories;
}) {
  const bg = accessories?.background;
  const cap = accessories?.cap;
  const wrist = accessories?.wristband;

  const bgStyle: React.CSSProperties | undefined =
    bg === "neon"   ? { background: "radial-gradient(circle at 50% 60%, #39ff1455 0%, transparent 65%)" } :
    bg === "fire"   ? { background: "radial-gradient(circle at 50% 65%, #ff4d00aa 0%, #df00ff55 45%, transparent 75%)" } :
    bg === "cosmos" ? { background: "radial-gradient(circle at 50% 50%, #df00ffaa 0%, #00ffaeaa 35%, #0a0a25 80%)" } :
    undefined;

  const capColor =
    cap === "gold"  ? "#ffd700" :
    cap === "red"   ? "#ff2d55" :
    cap === "blue"  ? "#3aa0ff" :
    cap === "green" ? "#39ff14" : null;

  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }} aria-label={`avatar ${preset.id}`}>
      {/* Capa 0: fondo/escenario */}
      {bgStyle && (
        <div
          className="absolute inset-0 rounded-2xl animate-pulse"
          style={{ ...bgStyle, animationDuration: "3s" }}
        />
      )}
      {/* Capa 1: aura de muñequera (tinte del rango) */}
      {wrist && (
        <div
          className="absolute inset-1 rounded-full"
          style={{ boxShadow: `inset 0 0 ${size * 0.18}px ${wrist.color}aa, 0 0 ${size * 0.12}px ${wrist.color}77` }}
        />
      )}
      {/* Capa 2: personaje */}
      <img
        src={preset.img}
        alt=""
        width={size}
        height={size}
        loading="lazy"
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain"
      />
      {/* Capa 3: gorra/casco encima de la cabeza */}
      {capColor && (
        <svg
          viewBox="0 0 100 100"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        >
          {/* casco semi-realista, posicionado sobre la zona de cabeza típica */}
          <g transform="translate(50 18)">
            {/* sombra */}
            <ellipse cx="0" cy="6" rx="16" ry="3" fill="#000" opacity="0.25"/>
            {/* casco principal */}
            <path
              d="M -16 4 Q -16 -12 0 -12 Q 16 -12 16 4 Z"
              fill={capColor}
              stroke="#000"
              strokeWidth="1.2"
            />
            {/* visera */}
            <path d="M -18 4 L 18 4 L 14 7 L -14 7 Z" fill={capColor} stroke="#000" strokeWidth="1.2"/>
            {/* logo ADN */}
            <text x="0" y="0" textAnchor="middle" fontSize="6" fontWeight="900" fill="#000" fontFamily="Orbitron, sans-serif">ADN</text>
            {/* brillo */}
            <path d="M -10 -6 Q -6 -10 2 -10" fill="none" stroke="#fff" strokeWidth="1.2" opacity="0.7" strokeLinecap="round"/>
          </g>
        </svg>
      )}
    </div>
  );
}

/* ─── Celebración de subida de nivel ─── */
function LevelUpCelebration({
  preset, accessories, beltLabel, onClose,
}: {
  preset: AvatarPreset;
  accessories: Accessories;
  beltLabel: string;
  onClose: () => void;
}) {
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
        <div className="absolute inset-0 rounded-full blur-3xl opacity-80 animate-pulse"
             style={{ background: "radial-gradient(circle, #39ff14 0%, #df00ff 60%, transparent 75%)" }} />
        <div className="relative animate-bounce">
          <AvatarImage preset={preset} size={240} accessories={accessories} />
        </div>
      </div>
      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">
        Tu constancia rinde frutos. ¡Seguí entrenando, ninja!
      </p>
      <button onClick={onClose} className="adn-btn-primary mt-6 px-8 py-3 text-sm">SEGUIR</button>
    </div>
  );
}

/* ─── Evolución ─── */
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

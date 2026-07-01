import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User, BarChart3, Check, Lock, ArrowLeft, Flame, CalendarOff, X, KeyRound } from "lucide-react";
import { BELTS, beltFromXp, SKILLS, type SkillKey, type BeltKey } from "@/lib/adn-game";

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

/* ─── Pulseras (imágenes por color/rango) ─── */
import wbNone from "@/assets/wristbands/none.png";
import wbWhite from "@/assets/wristbands/white.png";
import wbGreen from "@/assets/wristbands/green.png";
import wbBlue from "@/assets/wristbands/blue.png";
import wbRed from "@/assets/wristbands/red.png";
import wbBlack from "@/assets/wristbands/black.png";

const WRISTBAND_IMG: Record<BeltKey, string> = {
  none: wbNone, white: wbWhite, green: wbGreen, blue: wbBlue, red: wbRed, black: wbBlack,
};

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

/* ─── Escenarios: monumentos de La Plata (1 default + 7 desbloqueables) ─── */
import scMuseo from "@/assets/scenarios/museo.jpg";
import scPlaza from "@/assets/scenarios/plaza-moreno.jpg";
import scCatedral from "@/assets/scenarios/catedral.jpg";
import scCastillo from "@/assets/scenarios/castillo.jpg";
import scLago from "@/assets/scenarios/lago.jpg";
import scParlamento from "@/assets/scenarios/parlamento.jpg";
import scRambla from "@/assets/scenarios/rambla.jpg";
import scAerea from "@/assets/scenarios/aerea.jpg";

type Scenario = { id: string; name: string; img: string };
const SCENARIOS: Scenario[] = [
  { id: "museo",      name: "Museo de La Plata",              img: scMuseo },
  { id: "plaza",      name: "Plaza Moreno y Catedral",        img: scPlaza },
  { id: "catedral",   name: "Escaleras de la Catedral",       img: scCatedral },
  { id: "castillo",   name: "República de los Niños · Castillo",  img: scCastillo },
  { id: "lago",       name: "República de los Niños · Lago",      img: scLago },
  { id: "parlamento", name: "República de los Niños · Parlamento", img: scParlamento },
  { id: "rambla",     name: "Rambla Av. 32 y 17",             img: scRambla },
  { id: "aerea",      name: "Vista aérea de La Plata",        img: scAerea },
];

/* ─── Obstáculos del Medallero ─── */
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

/** Lista en orden (1..9) — unlock mapping abajo se basa en este orden. */
const OBSTACLES: { name: string; img: string; unlock: (s: Skills) => boolean }[] = [
  // 1 Salto
  { name: "Muro Curvado",       img: obMuro,      unlock: (s) => skillFull(s.jump_xp) },
  // 2 Agarre + Resistencia
  { name: "Pasamanos",          img: obPasamanos, unlock: (s) => skillFull(s.grip_xp) && skillFull(s.resistance_xp) },
  // 3 Agarre + Resistencia
  { name: "Escalera Invertida", img: obEscalera,  unlock: (s) => skillFull(s.grip_xp) && skillFull(s.resistance_xp) },
  // 4 Salto
  { name: "5 Escalones",        img: obEscalones, unlock: (s) => skillFull(s.jump_xp) },
  // 5 Fuerza
  { name: "Palestra",           img: obPalestra,  unlock: (s) => skillFull(s.strength_xp) },
  // 6 Fuerza
  { name: "Pegboard",           img: obPegboard,  unlock: (s) => skillFull(s.strength_xp) },
  // 7 Velocidad
  { name: "Pelotas Colgantes",  img: obPelotas,   unlock: (s) => skillFull(s.speed_xp) },
  // 8 Equilibrio + Coordinación
  { name: "Tronco Giratorio",   img: obTronco,    unlock: (s) => skillFull(s.balance_xp) && skillFull(s.coordination_xp) },
  // 9 Equilibrio + Coordinación
  { name: "Puente Colgante",    img: obPuente,    unlock: (s) => skillFull(s.balance_xp) && skillFull(s.coordination_xp) },
];

const SKILL_MAX = 500; // 100% de la barra
function skillFull(v: number | undefined) { return (v ?? 0) >= SKILL_MAX; }

/* ─── Helpers de aleatoriedad determinística por alumno ─── */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rand = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
  };
  const out = arr.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

type Belt = (typeof BELTS)[number];
type BeltThresholds = Record<Exclude<BeltKey, "none">, number>;
const DEFAULT_THRESHOLDS: BeltThresholds = { white: 11, green: 16, blue: 21, red: 26, black: 31 };

type Accessories = { wristband: { color: string; key: BeltKey } | null; background: Scenario };

type TabKey = "medals" | "avatar" | "evo";

function StudentDashboard() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<TabKey>("medals");
  const [student, setStudent] = useState<Student | null>(null);
  const [skills, setSkills] = useState<Skills | null>(null);
  const [avatarId, setAvatarId] = useState<string>("b1");
  const [scenarioId, setScenarioId] = useState<string>("default");
  const [attendanceDays, setAttendanceDays] = useState<number>(0);
  const [obstacleCounts, setObstacleCounts] = useState<Record<string, number>>({});
  const [thresholds, setThresholds] = useState<BeltThresholds>(DEFAULT_THRESHOLDS);
  const [celebrate, setCelebrate] = useState<null | { beltKey: string; beltLabel: string }>(null);
  const [birthday, setBirthday] = useState<null | { seed: string }>(null);
  const [streak, setStreak] = useState<number>(0);
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

      const { data: av } = await supabase.from("avatars").select("hair, hair_color").eq("student_id", stu.id).maybeSingle();
      if (av?.hair && AVATAR_PRESETS.some((p) => p.id === av.hair)) setAvatarId(av.hair);
      if (av?.hair_color && SCENARIOS.some((sc) => sc.id === av.hair_color)) setScenarioId(av.hair_color);

      // Asistencia: días distintos + conteo por obstáculo
      const { data: logs } = await supabase
        .from("attendance_logs")
        .select("date, class_type_id, class_types(name)")
        .eq("student_id", stu.id);
      const counts: Record<string, number> = {};
      const days = new Set<string>();
      (logs ?? []).forEach((r: any) => {
        const n = r.class_types?.name;
        if (n) counts[n] = (counts[n] ?? 0) + 1;
        if (r.date) days.add(String(r.date));
      });
      setObstacleCounts(counts);
      setAttendanceDays(days.size);

      // Thresholds dinámicos desde app_settings
      try {
        const { data: ts } = await (supabase.from as any)("app_settings")
          .select("value").eq("key", "belt_thresholds").maybeSingle();
        if (ts?.value && typeof ts.value === "object") {
          setThresholds({
            white: Number(ts.value.white ?? DEFAULT_THRESHOLDS.white),
            green: Number(ts.value.green ?? DEFAULT_THRESHOLDS.green),
            blue:  Number(ts.value.blue  ?? DEFAULT_THRESHOLDS.blue),
            red:   Number(ts.value.red   ?? DEFAULT_THRESHOLDS.red),
            black: Number(ts.value.black ?? DEFAULT_THRESHOLDS.black),
          });
        }
      } catch { /* fallback */ }

      const { data: streakData } = await supabase.rpc("attendance_streak_weeks", { _student_id: stu.id });
      setStreak(typeof streakData === "number" ? streakData : 0);

      // Subida de muñequera
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

      // Cumpleaños
      if (stu.birth_date) {
        const today = new Date();
        const [, bm, bd] = stu.birth_date.split("-").map(Number);
        if (bm === today.getMonth() + 1 && bd === today.getDate()) {
          const year = today.getFullYear();
          const bdayKey = `adn:bday:${stu.id}:${year}`;
          if (!localStorage.getItem(bdayKey)) {
            setBirthday({ seed: `${stu.id}-${year}` });
            localStorage.setItem(bdayKey, "1");
          }
        }
      }
    })();
  }, [navigate]);

  // Desbloqueos derivados de asistencia
  const avatarOrder = useMemo(
    () => student ? seededShuffle(AVATAR_PRESETS.map((p) => p.id), `${student.id}:avatars`) : AVATAR_PRESETS.map((p) => p.id),
    [student],
  );
  const scenarioOrder = useMemo(() => {
    if (!student) return SCENARIOS.map((s) => s.id);
    const rest = SCENARIOS.filter((s) => s.id !== "default").map((s) => s.id);
    return ["default", ...seededShuffle(rest, `${student.id}:scenarios`)];
  }, [student]);

  const avatarsUnlockedCount = Math.min(AVATAR_PRESETS.length, 1 + Math.floor(attendanceDays / 28));
  const scenariosUnlockedCount = Math.min(SCENARIOS.length, 1 + Math.floor(attendanceDays / 15));
  const unlockedAvatarIds = new Set(avatarOrder.slice(0, avatarsUnlockedCount));
  const unlockedScenarioIds = new Set(scenarioOrder.slice(0, scenariosUnlockedCount));

  async function selectAvatar(id: string) {
    if (!unlockedAvatarIds.has(id)) { toast.info("Personaje bloqueado. Seguí asistiendo a clase."); return; }
    setAvatarId(id);
    if (!student) return;
    const preset = AVATAR_PRESETS.find((p) => p.id === id)!;
    await supabase.from("avatars").upsert(
      { student_id: student.id, hair: preset.id, gender: preset.gender, skin: "#000", hair_color: scenarioId },
      { onConflict: "student_id" },
    );
  }

  async function selectScenario(id: string) {
    if (!unlockedScenarioIds.has(id)) { toast.info("Escenario bloqueado. Seguí asistiendo a clase."); return; }
    setScenarioId(id);
    if (!student) return;
    const preset = AVATAR_PRESETS.find((p) => p.id === avatarId)!;
    await supabase.from("avatars").upsert(
      { student_id: student.id, hair: preset.id, gender: preset.gender, skin: "#000", hair_color: id },
      { onConflict: "student_id" },
    );
  }

  async function logout() { await supabase.auth.signOut(); navigate({ to: "/adn/auth" }); }

  if (!student || !skills) return <div className="p-10 text-center text-white/60">Cargando...</div>;

  const belt = beltFromXp(student.total_xp);
  const beltDb = BELTS.find((b) => b.key === student.current_belt_color) ?? belt.current;
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) ?? AVATAR_PRESETS[0];
  const scenario = SCENARIOS.find((s) => s.id === scenarioId) ?? SCENARIOS[0];
  const accessories: Accessories = {
    wristband: beltDb.key === "none" ? null : { color: beltDb.hex, key: beltDb.key },
    background: scenario,
  };

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
            skills={skills}
            counts={obstacleCounts}
            onAvatar={() => setTab("avatar")}
            onEvo={() => setTab("evo")}
            belt={belt}
            streak={streak}
          />
        )}
        {tab === "avatar" && (
          <SubScreen title="Avatar" onBack={() => setTab("medals")}>
            <AvatarStudio
              selectedId={avatarId}
              onSelect={selectAvatar}
              accessories={accessories}
              currentBelt={beltDb}
              thresholds={thresholds}
              level={belt.level}
              unlockedAvatarIds={unlockedAvatarIds}
              avatarOrder={avatarOrder}
              avatarsUnlockedCount={avatarsUnlockedCount}
              unlockedScenarioIds={unlockedScenarioIds}
              scenariosUnlockedCount={scenariosUnlockedCount}
              attendanceDays={attendanceDays}
              selectedScenarioId={scenarioId}
              onSelectScenario={selectScenario}
              scenarioOrder={scenarioOrder}
            />
          </SubScreen>
        )}
        {tab === "evo" && (
          <SubScreen title="Evolución" onBack={() => setTab("medals")}>
            <Evolution student={student} skills={skills} belt={belt} beltDb={beltDb} />
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

/* ─── SubScreen wrapper ─── */
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
  skills, counts, onAvatar, onEvo, belt, streak,
}: {
  skills: Skills;
  counts: Record<string, number>;
  onAvatar: () => void;
  onEvo: () => void;
  belt: ReturnType<typeof beltFromXp>;
  streak: number;
}) {
  void counts;
  const unlocks = OBSTACLES.map((o) => o.unlock(skills));
  const unlockedCount = unlocks.filter(Boolean).length;
  const active = streak > 0;
  return (
    <div className="space-y-5">
      {/* Racha de asistencia */}
      <div className={`adn-card relative overflow-hidden p-4 ${active ? "border-[var(--adn-fluor)]/60 shadow-[0_0_22px_#39ff1433]" : ""}`}>
        {active && (
          <div aria-hidden className="pointer-events-none absolute inset-0 opacity-60"
            style={{ background: "radial-gradient(120% 80% at 0% 0%, #39ff1422 0%, transparent 55%)" }} />
        )}
        <div className="relative flex items-center gap-3">
          <div className={`h-12 w-12 shrink-0 rounded-xl grid place-items-center border ${
            active ? "border-[var(--adn-fluor)] bg-[#39ff14]/10 text-[var(--adn-fluor)] shadow-[0_0_14px_#39ff1455] animate-pulse"
                   : "border-white/15 bg-white/5 text-white/50"}`}>
            {active ? <Flame size={24} strokeWidth={2.5}/> : <CalendarOff size={22}/>}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] tracking-[0.3em] text-white/50">RACHA NINJA</div>
            <div className="flex items-baseline gap-1.5">
              <span className={`text-2xl font-black leading-none ${active ? "adn-fluor" : "text-white/70"}`}>{streak}</span>
              <span className="text-xs text-white/60">{streak === 1 ? "semana" : "semanas"}</span>
            </div>
            <div className="text-[11px] text-white/70 mt-0.5 leading-snug">
              {active ? `Llevás ${streak} ${streak === 1 ? "semana" : "semanas"} seguidas entrenando. ¡Así se hace!`
                      : "Volvé a clase para arrancar tu racha."}
            </div>
          </div>
        </div>
      </div>

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
        {OBSTACLES.map((o, idx) => {
          const unlocked = unlocks[idx];
          return (
            <div key={o.name}
              className={`relative aspect-square rounded-2xl border p-2 flex flex-col items-center justify-between overflow-hidden ${
                unlocked ? "bg-black/40 border-[var(--adn-fluor)]/50 shadow-[0_0_18px_#39ff1433]"
                         : "bg-black/30 border-white/10"}`}>
              <img src={o.img} alt={o.name}
                className={`w-full flex-1 object-contain ${unlocked ? "" : "grayscale opacity-40"}`}
                draggable={false} />
              <div className="text-[9px] uppercase text-center text-white/70 leading-tight w-full px-1 truncate">{o.name}</div>
              {unlocked ? (
                <span className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full grid place-items-center bg-[var(--adn-fluor)] text-black shadow-[0_0_10px_#39ff14]">
                  <Check size={13} strokeWidth={3}/>
                </span>
              ) : (
                <span className="absolute inset-0 grid place-items-center pointer-events-none">
                  <span className="h-9 w-9 rounded-full bg-black/70 border border-white/20 grid place-items-center shadow-[0_0_12px_#39ff1466]">
                    <Lock size={16} className="adn-fluor" />
                  </span>
                </span>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-2 gap-3 pt-2">
        <button onClick={onAvatar} className="adn-card p-5 flex flex-col items-center gap-2 hover:border-[var(--adn-fluor)]/60 transition">
          <User size={28} className="adn-fluor"/>
          <div className="text-xs tracking-[0.3em] font-bold">AVATAR</div>
        </button>
        <button onClick={onEvo} className="adn-card p-5 flex flex-col items-center gap-2 hover:border-[var(--adn-fluor)]/60 transition">
          <BarChart3 size={28} className="adn-fluor"/>
          <div className="text-xs tracking-[0.3em] font-bold">EVOLUCIÓN</div>
        </button>
      </div>
    </div>
  );
}

/* ─── Avatar Studio ─── */
function AvatarStudio({
  selectedId, onSelect, accessories, currentBelt, thresholds, level,
  unlockedAvatarIds, avatarOrder, avatarsUnlockedCount,
  unlockedScenarioIds, scenariosUnlockedCount, attendanceDays,
  selectedScenarioId, onSelectScenario, scenarioOrder,
}: {
  selectedId: string;
  onSelect: (id: string) => void;
  accessories: Accessories;
  currentBelt: Belt;
  thresholds: BeltThresholds;
  level: number;
  unlockedAvatarIds: Set<string>;
  avatarOrder: string[];
  avatarsUnlockedCount: number;
  unlockedScenarioIds: Set<string>;
  scenariosUnlockedCount: number;
  attendanceDays: number;
  selectedScenarioId: string;
  onSelectScenario: (id: string) => void;
  scenarioOrder: string[];
}) {
  const selected = AVATAR_PRESETS.find((p) => p.id === selectedId) ?? AVATAR_PRESETS[0];

  // Lista ordenada de muñequeras para el panel izq (incluye "none" como base bloqueado/inicial)
  const beltLadder: { belt: Belt; required: number }[] = [
    { belt: BELTS.find((b) => b.key === "white")!, required: thresholds.white },
    { belt: BELTS.find((b) => b.key === "green")!, required: thresholds.green },
    { belt: BELTS.find((b) => b.key === "blue")!,  required: thresholds.blue  },
    { belt: BELTS.find((b) => b.key === "red")!,   required: thresholds.red   },
    { belt: BELTS.find((b) => b.key === "black")!, required: thresholds.black },
  ];

  return (
    <div className="space-y-5">
      {/* Zona central: paneles laterales + avatar */}
      <div className="adn-card p-4">
        <div className="grid grid-cols-[72px_1fr_72px] gap-3 items-stretch">
          {/* PANEL IZQ — Pulseras (mismo patrón visual que Medallero) */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-2 flex flex-col items-center gap-2">
            <div className="text-[8px] tracking-[0.25em] text-white/50 text-center leading-tight">PULSE-<br/>RAS</div>
            {beltLadder.slice().reverse().map(({ belt, required }) => {
              const unlocked = level >= required;
              const isCurrent = belt.key === currentBelt.key && currentBelt.key !== "none";
              return (
                <div key={belt.key}
                  title={`${belt.label} · L${required}`}
                  className={`relative h-14 w-14 rounded-lg border overflow-hidden flex items-center justify-center ${
                    isCurrent ? "border-[var(--adn-fluor)] shadow-[0_0_12px_#39ff14aa] animate-pulse"
                              : unlocked ? "border-white/20" : "border-white/10"
                  }`}
                  style={{ background: "rgba(0,0,0,0.35)" }}>
                  <img src={WRISTBAND_IMG[belt.key]} alt={belt.label}
                    className={`w-full h-full object-contain ${unlocked ? "" : "grayscale opacity-40"}`}
                    draggable={false} loading="lazy"/>
                  {!unlocked && (
                    <span className="absolute inset-0 grid place-items-center pointer-events-none">
                      <span className="h-6 w-6 rounded-full bg-black/70 border border-white/20 grid place-items-center shadow-[0_0_8px_#39ff1455]">
                        <Lock size={11} className="adn-fluor"/>
                      </span>
                    </span>
                  )}
                  <span className="absolute bottom-0 inset-x-0 text-[8px] text-center text-white/70 bg-black/60 leading-none py-0.5">L{required}</span>
                </div>
              );
            })}
          </div>

          {/* CENTRO — Avatar sobre escenario (sin recuadro negro) */}
          <div className="rounded-2xl overflow-hidden grid place-items-center"
               style={{ background: accessories.background.css, minHeight: 260 }}>
            <AvatarImage preset={selected} size={240} accessories={accessories} />
          </div>

          {/* PANEL DER — Escenarios (mismo patrón) */}
          <div className="rounded-xl border border-white/10 bg-black/40 p-2 flex flex-col items-center gap-2">
            <div className="text-[8px] tracking-[0.25em] text-white/50 text-center leading-tight">ESCENA-<br/>RIOS</div>
            {scenarioOrder.slice(0, 5).map((scId) => {
              const sc = SCENARIOS.find((s) => s.id === scId)!;
              const unlocked = unlockedScenarioIds.has(sc.id);
              const active = sc.id === selectedScenarioId;
              return (
                <button key={sc.id}
                  onClick={() => onSelectScenario(sc.id)}
                  title={unlocked ? sc.name : "Bloqueado"}
                  className={`relative h-14 w-14 rounded-lg border overflow-hidden transition ${
                    active ? "border-[var(--adn-fluor)] shadow-[0_0_12px_#39ff14aa]"
                           : unlocked ? "border-white/20" : "border-white/10"
                  }`}
                  style={{ background: sc.css, filter: unlocked ? "none" : "grayscale(1) brightness(0.55)" }}>
                  {!unlocked && (
                    <span className="absolute inset-0 grid place-items-center bg-black/30 pointer-events-none">
                      <span className="h-6 w-6 rounded-full bg-black/70 border border-white/20 grid place-items-center shadow-[0_0_8px_#39ff1455]">
                        <Lock size={11} className="adn-fluor"/>
                      </span>
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="mt-3 text-center text-[10px] text-white/50">
          {scenariosUnlockedCount}/{SCENARIOS.length} escenarios · {avatarsUnlockedCount}/{AVATAR_PRESETS.length} personajes · {attendanceDays} días asistidos
        </div>
        <div className="mt-1 text-center text-[9px] text-white/40">
          Cada 15 días desbloqueás un escenario nuevo · Cada 4 semanas un personaje nuevo
        </div>
      </div>

      {/* Cambiar contraseña */}
      <ChangePasswordCard />


      {/* Galería de personajes */}
      <div className="adn-card p-5">
        <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">GALERÍA · 10 PERSONAJES</div>
        <div className="grid grid-cols-5 gap-2.5">
          {avatarOrder.map((id) => {
            const p = AVATAR_PRESETS.find((x) => x.id === id)!;
            const active = p.id === selectedId;
            const unlocked = unlockedAvatarIds.has(p.id);
            return (
              <button key={p.id} onClick={() => onSelect(p.id)}
                style={{ background: "radial-gradient(circle at 50% 65%, #1b1b2e 0%, #050505 75%)" }}
                className={`relative aspect-square rounded-xl border-2 p-1 transition overflow-hidden ${
                  active ? "border-[var(--adn-fluor)]" : "border-white/10 hover:border-white/30"
                }`}>
                <AvatarImage preset={p} size={72} />
                {!unlocked && (
                  <span className="absolute inset-0 grid place-items-center bg-black/40">
                    <span className="h-7 w-7 rounded-full bg-black/80 border border-[var(--adn-fluor)]/60 grid place-items-center shadow-[0_0_10px_#39ff14aa]">
                      <Lock size={12} className="adn-fluor"/>
                    </span>
                  </span>
                )}
                {active && unlocked && (
                  <span className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full bg-[var(--adn-fluor)] text-black grid place-items-center shadow-[0_0_12px_#39ff14]">
                    <Check size={12} strokeWidth={3}/>
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-3 text-[10px] text-white/40 text-center">
          Iniciás con 1 personaje al azar. Los demás se desbloquean cada 4 semanas de asistencia.
        </div>
      </div>
    </div>
  );
}

/* ─── Brazo + muñequera (PNG) para Evolución ─── */
function ForearmWristband({ beltKey, size = 96 }: { beltKey: BeltKey; size?: number }) {
  return (
    <img src={WRISTBAND_IMG[beltKey]} alt="muñequera" width={size} height={size}
      loading="lazy" draggable={false}
      style={{ width: size, height: size, objectFit: "contain" }} />
  );
}

/* ─── Avatar Image (transparente, sin recuadro, sin cartel ADN) ─── */
function AvatarImage({
  preset, size = 120, accessories,
}: {
  preset: AvatarPreset;
  size?: number;
  accessories?: Accessories;
}) {
  const wrist = accessories?.wristband;
  return (
    <div className="relative mx-auto select-none" style={{ width: size, height: size }} aria-label={`avatar ${preset.id}`}>
      {wrist && (
        /* Halo sutil del color de la pulsera (solo glow, sin cartel) */
        <div className="absolute inset-0 rounded-full pointer-events-none"
          style={{ boxShadow: `0 0 ${size * 0.14}px ${wrist.color}77` }} />
      )}
      <img src={preset.img} alt="" width={size} height={size} loading="lazy" draggable={false}
        className="absolute inset-0 w-full h-full object-contain" />
    </div>
  );
}

/* ─── Cambiar contraseña (familia / alumno) ─── */
function ChangePasswordCard() {
  const [open, setOpen] = useState(false);
  const [pwd1, setPwd1] = useState("");
  const [pwd2, setPwd2] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pwd1.length < 6) { toast.error("Mínimo 6 caracteres."); return; }
    if (pwd1 !== pwd2) { toast.error("Las contraseñas no coinciden."); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd1 });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Contraseña actualizada.");
    setPwd1(""); setPwd2(""); setOpen(false);
  }
  return (
    <div className="adn-card p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="adn-fluor text-sm">🔐</span>
          <span className="text-sm font-bold">Cambiar contraseña</span>
        </div>
        <span className="text-white/40 text-xs">{open ? "Cerrar" : "Abrir"}</span>
      </button>
      {open && (
        <form onSubmit={submit} className="mt-3 space-y-2">
          <input className="adn-input" type="password" placeholder="nueva contraseña" value={pwd1}
            onChange={(e) => setPwd1(e.target.value)} minLength={6} required autoComplete="new-password" />
          <input className="adn-input" type="password" placeholder="repetir contraseña" value={pwd2}
            onChange={(e) => setPwd2(e.target.value)} minLength={6} required autoComplete="new-password" />
          <button disabled={busy} className="adn-btn-primary w-full py-2.5 text-sm">{busy ? "Guardando..." : "Guardar"}</button>
        </form>
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
      <div className="relative mt-6 animate-bounce">
        <AvatarImage preset={preset} size={260} accessories={accessories} />
      </div>
      <p className="mt-6 text-sm text-white/70 text-center max-w-xs">Tu constancia rinde frutos. ¡Seguí entrenando, ninja!</p>
      <button onClick={onClose} className="adn-btn-primary mt-6 px-8 py-3 text-sm">SEGUIR</button>
    </div>
  );
}

/* ─── Evolución ─── */
function Evolution({ student, skills, belt, beltDb }: { student: Student; skills: Skills; belt: ReturnType<typeof beltFromXp>; beltDb: Belt }) {
  return (
    <div className="space-y-5">
      <div className="adn-card p-5">
        <div className="flex items-center gap-4">
          <ForearmWristband beltKey={beltDb.key} size={96} />
          <div>
            <div className="text-[10px] tracking-[0.3em] text-white/50">RANGO ACTUAL</div>
            <div className="text-xl font-black">{beltDb.label}</div>
            <div className="text-xs text-white/60">{beltDb.subtitle} · {student.total_xp} XP</div>
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
            const pct = Math.min(100, (v / SKILL_MAX) * 100);
            const full = pct >= 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white">{label}</span>
                  <span className={full ? "adn-fluor font-bold" : "text-white/50"}>{v} / {SKILL_MAX} XP</span>
                </div>
                <div className="h-2.5 bg-white/5 rounded-full overflow-hidden">
                  <div className="adn-bar-fill" style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 text-[10px] text-white/40 leading-snug">
          Completá las barras al 100% para desbloquear los obstáculos del medallero.
        </div>
      </div>
    </div>
  );
}

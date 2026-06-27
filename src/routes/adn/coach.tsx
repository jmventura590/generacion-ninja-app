import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/adn/coach")({
  component: CoachDashboard,
});

const SHIFTS = [
  { key: "young", label: "Turno 6-9 años",  min: 6, max: 9 },
  { key: "old",   label: "Turno 10-14 años", min: 10, max: 14 },
] as const;

type Student = { id: string; student_name: string; age: number | null; total_xp: number };
type ClassType = { id: string; name: string };

function CoachDashboard() {
  const navigate = useNavigate();
  const [pinOk, setPinOk] = useState(false);
  const [pin, setPin] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const [shift, setShift] = useState<(typeof SHIFTS)[number]["key"]>("young");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [classId, setClassId] = useState<string>("");
  const [picked, setPicked] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);
  const [alreadyToday, setAlreadyToday] = useState<Set<string>>(new Set());

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate({ to: "/adn/auth" }); return; }
      const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", session.user.id);
      if (!(roles ?? []).some((r) => r.role === "coach")) {
        toast.error("Esta vista es solo para coaches.");
        navigate({ to: "/adn/student" });
        return;
      }
      setAuthChecked(true);
    })();
  }, [navigate]);

  useEffect(() => {
    if (!pinOk) return;
    (async () => {
      const { data: s } = await supabase.from("student_profiles").select("id, student_name, age, total_xp").order("student_name");
      setStudents((s ?? []) as Student[]);
      const { data: c } = await supabase.from("class_types").select("id, name").order("name");
      setClasses((c ?? []) as ClassType[]);
      if (!classId && c?.[0]) setClassId(c[0].id);

      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from("attendance_logs").select("student_id").eq("date", today);
      setAlreadyToday(new Set((logs ?? []).map((l: any) => l.student_id)));
    })();
  }, [pinOk, classId]);

  const filtered = useMemo(() => {
    const s = SHIFTS.find((x) => x.key === shift)!;
    return students.filter((st) => (st.age ?? 0) >= s.min && (st.age ?? 0) <= s.max);
  }, [students, shift]);

  function togglePick(id: string) {
    if (alreadyToday.has(id)) return;
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }

  async function submitAttendance() {
    const ids = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    if (!classId || ids.length === 0) {
      toast.error("Elegí clase y al menos un alumno.");
      return;
    }
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const rows = ids.map((sid) => ({ student_id: sid, class_type_id: classId, date: today }));
    const { error, count } = await supabase.from("attendance_logs").insert(rows, { count: "exact" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Asistencia registrada: ${count ?? rows.length} alumno(s).`);
      setPicked({});
      setAlreadyToday((prev) => { const n = new Set(prev); ids.forEach((i) => n.add(i)); return n; });
      const { data: s } = await supabase.from("student_profiles").select("id, student_name, age, total_xp").order("student_name");
      setStudents((s ?? []) as Student[]);
    }
    setSubmitting(false);
  }

  async function logout() { await supabase.auth.signOut(); navigate({ to: "/adn/auth" }); }

  if (!authChecked) return <div className="p-10 text-center text-white/60">Verificando...</div>;

  if (!pinOk) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <form
          onSubmit={(e) => { e.preventDefault(); if (pin === "1986") setPinOk(true); else { toast.error("PIN incorrecto"); setPin(""); } }}
          className="adn-card adn-card-glow p-8 w-full max-w-sm text-center space-y-4"
        >
          <ShieldCheck className="mx-auto adn-fluor" size={42} />
          <h1 className="text-xl font-black">ACCESO COACH</h1>
          <p className="text-xs text-white/60">Ingresá el PIN maestro</p>
          <input
            autoFocus
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="adn-input text-center text-3xl tracking-[0.6em] font-black"
            placeholder="••••"
          />
          <button className="adn-btn-primary w-full py-3">DESBLOQUEAR</button>
          <button type="button" onClick={logout} className="text-xs text-white/40 hover:text-white">Cerrar sesión</button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen [padding-bottom:calc(8rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-white/40">COACH</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">PANEL</span> <span className="adn-violet">ADN</span></h1>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><LogOut size={16}/>Salir</button>
      </header>

      <section className="px-5 space-y-4">
        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-2">A · TURNO</div>
          <div className="grid grid-cols-2 gap-2">
            {SHIFTS.map((s) => (
              <button key={s.key} onClick={() => setShift(s.key)}
                className={`py-3 rounded-lg text-sm font-bold border ${shift === s.key ? "border-[var(--adn-fluor)] bg-[var(--adn-fluor)]/10 text-white" : "border-white/10 text-white/60"}`}>
                {s.label}
              </button>
            ))}
          </div>
        </div>

        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-2">B · CONTENIDO DE CLASE</div>
          <select className="adn-input" value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => <option key={c.id} value={c.id} className="bg-black">{c.name}</option>)}
          </select>
        </div>

        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">C · ALUMNOS ({filtered.length})</div>
          <ul className="divide-y divide-white/5">
            {filtered.length === 0 && <li className="py-6 text-center text-white/40 text-sm">Sin alumnos en este turno.</li>}
            {filtered.map((st) => {
              const done = alreadyToday.has(st.id);
              const on = !!picked[st.id];
              return (
                <li key={st.id}>
                  <button onClick={() => togglePick(st.id)} disabled={done}
                    className={`w-full flex items-center justify-between py-3 px-1 text-left ${done ? "opacity-50" : ""}`}>
                    <div>
                      <div className="font-bold text-white">{st.student_name} <span className="text-white/40 text-xs">· {st.age ?? "?"}a</span></div>
                      <div className="text-xs text-white/40">{st.total_xp} XP</div>
                    </div>
                    <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center ${on ? "bg-[var(--adn-fluor)] border-[var(--adn-fluor)]" : "border-white/30"}`}>
                      {on && <span className="text-black font-black text-sm">✓</span>}
                      {done && !on && <span className="text-[10px] text-white/60">OK</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent">
        <button onClick={submitAttendance} disabled={submitting} className="adn-btn-primary w-full py-4 text-base">
          {submitting ? "Registrando..." : "Registrar asistencia de clase"}
        </button>
      </div>
    </div>
  );
}

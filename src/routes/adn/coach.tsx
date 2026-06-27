import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/adn/coach")({
  component: CoachDashboard,
});

type Student = { id: string; student_name: string; age: number | null; total_xp: number; group_id: string | null };
type ClassType = { id: string; name: string };
type Group = { id: string; code: string; days_label: string; starts_at: string; ends_at: string; sort_order: number };

function CoachDashboard() {
  const navigate = useNavigate();
  const [pinOk, setPinOk] = useState(false);
  const [pin, setPin] = useState("");
  const [authChecked, setAuthChecked] = useState(false);

  const [groups, setGroups] = useState<Group[]>([]);
  const [groupId, setGroupId] = useState<string>("");
  const [students, setStudents] = useState<Student[]>([]);
  const [classes, setClasses] = useState<ClassType[]>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<Record<string, boolean>>({});
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
      const { data: g } = await supabase.from("class_groups").select("*").order("sort_order");
      const list = (g ?? []) as Group[];
      setGroups(list);
      if (!groupId && list[0]) setGroupId(list[0].id);

      const { data: s } = await supabase.from("student_profiles").select("id, student_name, age, total_xp, group_id").order("student_name");
      setStudents((s ?? []) as Student[]);
      const { data: c } = await supabase.from("class_types").select("id, name").order("name");
      setClasses((c ?? []) as ClassType[]);

      const today = new Date().toISOString().slice(0, 10);
      const { data: logs } = await supabase.from("attendance_logs").select("student_id").eq("date", today);
      setAlreadyToday(new Set((logs ?? []).map((l: any) => l.student_id)));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pinOk]);

  const filtered = useMemo(
    () => students.filter((st) => st.group_id === groupId),
    [students, groupId]
  );

  const selectedCount = useMemo(
    () => Object.values(selectedClassIds).filter(Boolean).length,
    [selectedClassIds]
  );

  function toggleClass(id: string) {
    setSelectedClassIds((p) => ({ ...p, [id]: !p[id] }));
  }
  function togglePick(id: string) {
    if (alreadyToday.has(id)) return;
    setPicked((p) => ({ ...p, [id]: !p[id] }));
  }

  async function submitAttendance() {
    const studentIds = Object.entries(picked).filter(([, v]) => v).map(([k]) => k);
    const classIds = Object.entries(selectedClassIds).filter(([, v]) => v).map(([k]) => k);
    if (classIds.length === 0 || studentIds.length === 0) {
      toast.error("Elegí al menos un obstáculo y un alumno.");
      return;
    }
    setSubmitting(true);
    const today = new Date().toISOString().slice(0, 10);
    const { data: { session } } = await supabase.auth.getSession();
    const coachId = session?.user.id ?? null;
    const n = classIds.length;
    const rows = studentIds.flatMap((sid) =>
      classIds.map((cid) => ({
        student_id: sid,
        class_type_id: cid,
        date: today,
        coach_id: coachId,
        obstacles_in_class: n,
      }))
    );
    const { error, count } = await supabase.from("attendance_logs").insert(rows, { count: "exact" });
    if (error) {
      toast.error(error.message);
    } else {
      const perStudentXp = classes.length // estimate: 100/N * N = ~100 per student
        ? 100
        : 0;
      toast.success(`Registradas ${count ?? rows.length} marcas (${studentIds.length} alumnos × ${n} obstáculos). ~${perStudentXp} XP por alumno.`);
      setPicked({});
      setSelectedClassIds({});
      setAlreadyToday((prev) => { const s = new Set(prev); studentIds.forEach((i) => s.add(i)); return s; });
      const { data: s } = await supabase.from("student_profiles").select("id, student_name, age, total_xp, group_id").order("student_name");
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
          <h1 className="text-xl font-black">Acceso Coach</h1>
          <p className="text-xs text-white/60">Ingresá el PIN maestro</p>
          <input
            autoFocus inputMode="numeric" pattern="[0-9]*" maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="adn-input text-center text-3xl tracking-[0.6em] font-black"
            placeholder="••••"
          />
          <button className="adn-btn-primary w-full py-3">Desbloquear</button>
          <button type="button" onClick={logout} className="text-xs text-white/40 hover:text-white">Cerrar sesión</button>
        </form>
      </div>
    );
  }

  const xpPerObstacle = selectedCount > 0 ? Math.floor(100 / selectedCount) : 0;

  return (
    <div className="min-h-screen [padding-bottom:calc(8rem+env(safe-area-inset-bottom))]">
      <header className="px-5 pt-6 pb-3 flex items-center justify-between">
        <div>
          <div className="text-[10px] tracking-[0.4em] text-white/40">COACH</div>
          <h1 className="text-2xl font-black"><span className="adn-fluor">Panel</span> <span className="adn-violet">ADN</span></h1>
        </div>
        <button onClick={logout} className="text-white/60 hover:text-white text-sm flex items-center gap-1"><LogOut size={16}/>Salir</button>
      </header>

      <section className="px-5 space-y-4">
        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-2">A · Grupo / Horario</div>
          <select className="adn-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            {groups.map((g) => (
              <option key={g.id} value={g.id} className="bg-black">
                {g.code} — {g.days_label} {g.starts_at.slice(0,5)}-{g.ends_at.slice(0,5)}
              </option>
            ))}
          </select>
        </div>

        <div className="adn-card p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] text-white/50">B · Obstáculos trabajados ({selectedCount})</div>
            {selectedCount > 0 && (
              <div className="text-[10px] text-white/60">{xpPerObstacle} XP × obstáculo · pozo 100 XP</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {classes.map((c) => {
              const on = !!selectedClassIds[c.id];
              return (
                <button key={c.id} type="button" onClick={() => toggleClass(c.id)}
                  className={`py-2.5 px-3 rounded-lg text-xs font-bold border text-left ${on ? "border-[var(--adn-fluor)] bg-[var(--adn-fluor)]/10 text-white" : "border-white/10 text-white/60"}`}>
                  <span className="inline-block w-3 h-3 rounded-sm border mr-2 align-middle"
                    style={{ borderColor: on ? "var(--adn-fluor)" : "rgba(255,255,255,0.3)", background: on ? "var(--adn-fluor)" : "transparent" }} />
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">C · Alumnos del grupo ({filtered.length})</div>
          <ul className="divide-y divide-white/5">
            {filtered.length === 0 && <li className="py-6 text-center text-white/40 text-sm">No hay alumnos asignados a este grupo.</li>}
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
          {submitting ? "Registrando..." : `Registrar asistencia (${Object.values(picked).filter(Boolean).length} alumnos · ${selectedCount} obstáculos)`}
        </button>
      </div>
    </div>
  );
}

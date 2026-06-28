import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { LogOut, ShieldCheck, UserPlus, Copy, Check, CalendarDays, Trash2, History } from "lucide-react";
import { createStudentAccount, USERNAME_DOMAIN } from "@/lib/adn-students.functions";

export const Route = createFileRoute("/adn/coach")({
  component: CoachDashboard,
});

type Student = { id: string; student_name: string; age: number | null; total_xp: number; group_id: string | null };
type ClassType = { id: string; name: string };
type Group = { id: string; code: string; days_label: string; starts_at: string; ends_at: string; sort_order: number };
type ExistingLog = { id: string; student_id: string; class_type_id: string };

const ALLOWED_DAYS: Record<string, number[]> = {
  "Lun/Mié/Vie": [1, 3, 5],
  "Mar/Jue": [2, 4],
  "Sábado": [6],
};

function todayISO() {
  const t = new Date();
  const off = t.getTimezoneOffset();
  return new Date(t.getTime() - off * 60_000).toISOString().slice(0, 10);
}
function weekdayOf(iso: string) {
  // iso is YYYY-MM-DD in local time
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1).getDay();
}
function dayLabelEs(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("es-AR", { weekday: "long", day: "2-digit", month: "long" });
}

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
  const [date, setDate] = useState<string>(todayISO());
  const [existing, setExisting] = useState<ExistingLog[]>([]);

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

  const reloadStudents = useCallback(async () => {
    const { data: s } = await supabase.from("student_profiles").select("id, student_name, age, total_xp, group_id").order("student_name");
    setStudents((s ?? []) as Student[]);
  }, []);

  useEffect(() => {
    if (!pinOk) return;
    (async () => {
      const { data: g } = await supabase.from("class_groups").select("*").order("sort_order");
      setGroups((g ?? []) as Group[]);
      await reloadStudents();
      const { data: c } = await supabase.from("class_types").select("id, name").order("name");
      setClasses((c ?? []) as ClassType[]);
    })();
  }, [pinOk, reloadStudents]);

  // Filter groups by weekday of selected date
  const dow = weekdayOf(date);
  const groupsForDate = useMemo(
    () => groups.filter((g) => (ALLOWED_DAYS[g.days_label] ?? []).includes(dow)),
    [groups, dow]
  );

  // Auto-pick a valid group when date / groups change
  useEffect(() => {
    if (groupsForDate.length === 0) { setGroupId(""); return; }
    if (!groupsForDate.some((g) => g.id === groupId)) setGroupId(groupsForDate[0].id);
  }, [groupsForDate, groupId]);

  // Load existing attendance for (date) — across all students; we filter by group on render.
  const reloadExisting = useCallback(async () => {
    if (!date) { setExisting([]); return; }
    const { data, error } = await supabase
      .from("attendance_logs")
      .select("id, student_id, class_type_id")
      .eq("date", date);
    if (error) { setExisting([]); return; }
    setExisting((data ?? []) as ExistingLog[]);
  }, [date]);

  useEffect(() => { if (pinOk) reloadExisting(); }, [pinOk, reloadExisting]);

  // Reset selection when changing date or group
  useEffect(() => { setPicked({}); setSelectedClassIds({}); }, [date, groupId]);

  const filtered = useMemo(
    () => students.filter((st) => st.group_id === groupId),
    [students, groupId]
  );

  // student_id → set of class_type_ids already registered on `date`
  const existingByStudent = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const e of existing) {
      if (!m.has(e.student_id)) m.set(e.student_id, new Set());
      m.get(e.student_id)!.add(e.class_type_id);
    }
    return m;
  }, [existing]);

  const isRetro = date !== todayISO();

  const selectedCount = useMemo(
    () => Object.values(selectedClassIds).filter(Boolean).length,
    [selectedClassIds]
  );

  function toggleClass(id: string) {
    setSelectedClassIds((p) => ({ ...p, [id]: !p[id] }));
  }
  function togglePick(id: string) {
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
    const { data: { session } } = await supabase.auth.getSession();
    const coachId = session?.user.id ?? null;
    const n = classIds.length;

    // Skip combos already present for that date (unique index would block them anyway).
    const rows = studentIds.flatMap((sid) =>
      classIds
        .filter((cid) => !(existingByStudent.get(sid)?.has(cid)))
        .map((cid) => ({
          student_id: sid,
          class_type_id: cid,
          date,
          coach_id: coachId,
          obstacles_in_class: n,
        }))
    );
    if (rows.length === 0) {
      toast.message("Todas esas marcas ya estaban registradas.");
      setSubmitting(false);
      return;
    }
    const { error, count } = await supabase.from("attendance_logs").insert(rows, { count: "exact" });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Registradas ${count ?? rows.length} marcas en ${dayLabelEs(date)}.`);
      setPicked({});
      setSelectedClassIds({});
      await reloadExisting();
      await reloadStudents();
    }
    setSubmitting(false);
  }

  async function deleteStudentMarksForDate(studentId: string, studentName: string) {
    const ids = (existingByStudent.get(studentId) ? [...(existingByStudent.get(studentId)!)] : []);
    if (ids.length === 0) return;
    if (!confirm(`Borrar las ${ids.length} marca/s de ${studentName} en ${dayLabelEs(date)}? Se va a recalcular el XP y la muñequera.`)) return;
    const { error } = await supabase
      .from("attendance_logs")
      .delete()
      .eq("date", date)
      .eq("student_id", studentId);
    if (error) { toast.error(error.message); return; }
    toast.success(`Marcas borradas. XP recalculado.`);
    await reloadExisting();
    await reloadStudents();
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
          <p className="text-sm text-white/60">Ingresá el PIN maestro</p>
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
  const pickedCount = Object.values(picked).filter(Boolean).length;
  const studentsWithExisting = filtered.filter((st) => (existingByStudent.get(st.id)?.size ?? 0) > 0);

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
        <AddStudentCard groups={groups} onCreated={reloadStudents} />

        {/* Fecha */}
        <div className={`adn-card p-4 ${isRetro ? "border border-[var(--adn-violet)]/60" : ""}`}>
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] tracking-[0.3em] text-white/50 flex items-center gap-2">
              <CalendarDays size={12} className="adn-fluor" /> FECHA DE LA CLASE
            </div>
            {isRetro && <span className="text-[10px] adn-violet flex items-center gap-1"><History size={12}/>RETROACTIVO</span>}
            {!isRetro && <button type="button" onClick={() => setDate(todayISO())} className="text-[10px] text-white/40 hover:text-white">hoy</button>}
          </div>
          <input
            type="date"
            className="adn-input"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          <div className="text-sm text-white/60 mt-2 capitalize">{dayLabelEs(date)}</div>
          {isRetro && (
            <button type="button" onClick={() => setDate(todayISO())} className="mt-2 text-xs adn-fluor hover:underline">
              Volver a hoy
            </button>
          )}
        </div>

        {/* Grupo */}
        <div className="adn-card p-4">
          <div className="text-[10px] tracking-[0.3em] text-white/50 mb-2">A · Grupo / Horario ({groupsForDate.length} para este día)</div>
          {groupsForDate.length === 0 ? (
            <div className="text-sm text-white/50 py-3">No hay grupos programados para {dayLabelEs(date)}.</div>
          ) : (
            <select className="adn-input" value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              {groupsForDate.map((g) => (
                <option key={g.id} value={g.id} className="bg-black">
                  {g.code} — {g.days_label} {g.starts_at.slice(0,5)}-{g.ends_at.slice(0,5)}
                </option>
              ))}
            </select>
          )}
        </div>

        {groupId && (
          <>
            {/* Obstáculos */}
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

            {/* Alumnos */}
            <div className="adn-card p-4">
              <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">C · Alumnos del grupo ({filtered.length})</div>
              <ul className="divide-y divide-white/5">
                {filtered.length === 0 && <li className="py-6 text-center text-white/40 text-sm">No hay alumnos asignados a este grupo.</li>}
                {filtered.map((st) => {
                  const existCount = existingByStudent.get(st.id)?.size ?? 0;
                  const on = !!picked[st.id];
                  return (
                    <li key={st.id}>
                      <button onClick={() => togglePick(st.id)}
                        className="w-full flex items-center justify-between py-3 px-1 text-left">
                        <div>
                          <div className="font-bold text-white">{st.student_name} <span className="text-white/40 text-xs">· {st.age ?? "?"}a</span></div>
                          <div className="text-xs text-white/40">
                            {st.total_xp} XP
                            {existCount > 0 && <span className="ml-2 px-1.5 py-0.5 rounded bg-[var(--adn-fluor)]/15 adn-fluor">{existCount} marca/s en esta fecha</span>}
                          </div>
                        </div>
                        <div className={`h-6 w-6 rounded-md border-2 flex items-center justify-center ${on ? "bg-[var(--adn-fluor)] border-[var(--adn-fluor)]" : "border-white/30"}`}>
                          {on && <span className="text-black font-black text-sm">✓</span>}
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Marcas existentes para esa fecha */}
            {studentsWithExisting.length > 0 && (
              <div className="adn-card p-4">
                <div className="text-[10px] tracking-[0.3em] text-white/50 mb-3">D · Marcas ya registradas en esta fecha</div>
                <ul className="divide-y divide-white/5">
                  {studentsWithExisting.map((st) => {
                    const ids = existingByStudent.get(st.id) ?? new Set<string>();
                    const names = classes.filter((c) => ids.has(c.id)).map((c) => c.name);
                    return (
                      <li key={st.id} className="py-3 flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="font-bold text-white">{st.student_name}</div>
                          <div className="text-xs text-white/50 mt-0.5">{names.join(" · ")}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteStudentMarksForDate(st.id, st.student_name)}
                          className="shrink-0 inline-flex items-center gap-1 text-xs px-2 py-1.5 rounded-md border border-white/15 text-white/80 hover:border-red-500/60 hover:text-red-400"
                        >
                          <Trash2 size={14}/> Borrar
                        </button>
                      </li>
                    );
                  })}
                </ul>
                <div className="text-[10px] text-white/40 mt-3">Borrar marcas recalcula automáticamente el XP y la muñequera del alumno.</div>
              </div>
            )}
          </>
        )}
      </section>

      <div className="fixed bottom-0 left-0 right-0 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] bg-gradient-to-t from-black via-black/95 to-transparent">
        <button onClick={submitAttendance} disabled={submitting || !groupId} className="adn-btn-primary w-full py-4 text-base">
          {submitting
            ? "Registrando..."
            : `Registrar${isRetro ? " (retro)" : ""} (${pickedCount} alumnos · ${selectedCount} obstáculos)`}
        </button>
      </div>
    </div>
  );
}

/* ───────── Agregar alumno ───────── */
function AddStudentCard({ groups, onCreated }: { groups: Group[]; onCreated: () => void | Promise<void> }) {
  const createFn = useServerFn(createStudentAccount);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [username, setUsername] = useState("");
  const [familyUsername, setFamilyUsername] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{
    student: { username: string; password: string };
    family: { username: string; password: string };
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => { if (open && !groupId && groups[0]) setGroupId(groups[0].id); }, [open, groups, groupId]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const r = await createFn({ data: {
        name, birth_date: birth,
        username,
        family_username: familyUsername,
        group_id: groupId || null,
      } });
      if (!r.ok) { toast.error(r.error); return; }
      setResult({ student: r.student, family: r.family });
      setName(""); setBirth(""); setUsername(""); setFamilyUsername("");
      toast.success("Alumno creado.");
      await onCreated();
    } catch (err: any) {
      toast.error(err?.message ?? "No se pudo crear el alumno.");
    } finally {
      setBusy(false);
    }
  }

  async function copyAll() {
    if (!result) return;
    const text =
      `ALUMNO\nUsuario: ${result.student.username}\nContraseña: ${result.student.password}\n\n` +
      `FAMILIA (solo lectura)\nUsuario: ${result.family.username}\nContraseña: ${result.family.password}`;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { toast.error("No se pudo copiar."); }
  }

  return (
    <div className="adn-card p-4">
      <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center justify-between">
        <div className="flex items-center gap-2">
          <UserPlus size={18} className="adn-fluor" />
          <span className="text-sm font-bold">Agregar alumno</span>
        </div>
        <span className="text-white/40 text-xs">{open ? "Cerrar" : "Abrir"}</span>
      </button>

      {open && (
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div>
            <label className="text-[10px] tracking-widest text-white/50">NOMBRE (sin apellido)</label>
            <input className="adn-input" value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
          </div>
          <div>
            <label className="text-[10px] tracking-widest text-white/50">FECHA DE NACIMIENTO</label>
            <input type="date" className="adn-input" value={birth} onChange={(e) => setBirth(e.target.value)} required />
          </div>
          <div>
            <label className="text-[10px] tracking-widest text-white/50">USUARIO DEL ALUMNO</label>
            <input className="adn-input" value={username}
              onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
              required minLength={3} maxLength={24} placeholder="ej: benja08" />
          </div>
          <div>
            <label className="text-[10px] tracking-widest text-white/50">USUARIO DE LA FAMILIA (SOLO LECTURA)</label>
            <input className="adn-input" value={familyUsername}
              onChange={(e) => setFamilyUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, ""))}
              required minLength={3} maxLength={24} placeholder="ej: mama.benja08" />
            <div className="text-[10px] text-white/40 mt-1">Distinto al del alumno. Le da acceso de solo lectura a Evolución, Medallero y Avatar.</div>
          </div>
          <div>
            <label className="text-[10px] tracking-widest text-white/50">GRUPO / HORARIO</label>
            <select className="adn-input" value={groupId} onChange={(e) => setGroupId(e.target.value)} required>
              {groups.map((g) => (
                <option key={g.id} value={g.id} className="bg-black">
                  {g.code} — {g.days_label} {g.starts_at.slice(0,5)}-{g.ends_at.slice(0,5)}
                </option>
              ))}
            </select>
          </div>
          <button disabled={busy} className="adn-btn-primary w-full py-3 text-sm">
            {busy ? "Creando..." : "Crear cuentas (alumno + familia)"}
          </button>

          {result && (
            <div className="mt-3 rounded-lg border border-[var(--adn-fluor)]/40 bg-[var(--adn-fluor)]/5 p-3 space-y-3">
              <div className="text-[10px] tracking-widest adn-fluor">CUENTAS CREADAS — COMPARTIR</div>
              <div className="space-y-1">
                <div className="text-[10px] tracking-widest text-white/50">ALUMNO</div>
                <div className="text-sm font-mono"><span className="text-white/50">usuario:</span> <span className="text-white font-bold">{result.student.username}</span></div>
                <div className="text-sm font-mono"><span className="text-white/50">contraseña:</span> <span className="text-white font-bold">{result.student.password}</span></div>
              </div>
              <div className="space-y-1 pt-2 border-t border-white/10">
                <div className="text-[10px] tracking-widest text-white/50">FAMILIA (SOLO LECTURA)</div>
                <div className="text-sm font-mono"><span className="text-white/50">usuario:</span> <span className="text-white font-bold">{result.family.username}</span></div>
                <div className="text-sm font-mono"><span className="text-white/50">contraseña:</span> <span className="text-white font-bold">{result.family.password}</span></div>
              </div>
              <button type="button" onClick={copyAll} className="adn-btn-secondary px-3 py-2 text-xs flex items-center gap-2">
                {copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copiado" : "Copiar las dos cuentas"}
              </button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}

void USERNAME_DOMAIN;

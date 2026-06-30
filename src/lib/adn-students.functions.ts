import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Caracteres sin ambigüedad (sin 0/O, 1/l/I)
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function genPassword(len = 6) {
  let out = "";
  const buf = new Uint8Array(len);
  crypto.getRandomValues(buf);
  for (let i = 0; i < len; i++) out += ALPHABET[buf[i] % ALPHABET.length];
  return out;
}

function ageFromBirth(birth: string): number {
  const b = new Date(birth);
  const t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  const m = t.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && t.getDate() < b.getDate())) a--;
  return a;
}

export const STUDENT_DOMAIN = "alumno.adn.local";
export const FAMILY_DOMAIN = "familia.adn.local";
// Backwards-compat alias (algunos imports antiguos lo usan).
export const USERNAME_DOMAIN = STUDENT_DOMAIN;

const USERNAME_RE = /^[a-z0-9_.-]{3,24}$/;

export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: {
    name: string;
    birth_date: string;
    username: string;
    family_username: string;
    family_email: string;
    group_id: string | null;
  }) => d)
  .handler(async ({ data, context }) => {
    const fail = (msg: string) => ({ ok: false as const, error: msg });

    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const isCoach = (roles ?? []).some((r: any) => r.role === "coach");
    if (!isCoach) return fail("Solo coaches pueden dar de alta alumnos.");

    const username = data.username.trim().toLowerCase();
    const familyUsername = data.family_username.trim().toLowerCase();
    if (!USERNAME_RE.test(username)) return fail("Usuario del alumno inválido (3-24 letras/números/._-).");
    if (!USERNAME_RE.test(familyUsername)) return fail("Usuario de familia inválido (3-24 letras/números/._-).");
    if (username === familyUsername) return fail("El usuario de familia debe ser distinto al del alumno.");

    const familyEmailInput = (data.family_email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(familyEmailInput)) return fail("Email de contacto inválido.");

    const name = data.name.trim();
    if (!name) return fail("Nombre requerido.");
    const birth = data.birth_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return fail("Fecha de nacimiento inválida.");
    const age = ageFromBirth(birth);
    if (age < 3 || age > 99) return fail("Edad fuera de rango. Verificá la fecha de nacimiento.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dupStu } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dupStu) return fail("Ese usuario de alumno ya está en uso.");

    const { data: dupFam } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .ilike("family_username", familyUsername)
      .maybeSingle();
    if (dupFam) return fail("Ese usuario de familia ya está en uso.");

    // Email duplicado (otra familia ya usa este contacto)
    const { data: dupEmail } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .ilike("family_email", familyEmailInput)
      .maybeSingle();
    if (dupEmail) return fail("Ese email de contacto ya está registrado en otra familia.");

    const studentPwd = genPassword(6);
    const familyPwd = genPassword(6);
    const studentEmail = `${username}@${STUDENT_DOMAIN}`;
    // La cuenta de familia usa el EMAIL REAL para que pueda recuperar contraseña.
    const familyEmail = familyEmailInput;

    // 1) Cuenta del alumno
    const { data: createdStu, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email: studentEmail,
      password: studentPwd,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (cErr) throw cErr;
    const studentUserId = createdStu.user?.id;
    if (!studentUserId) throw new Error("No se pudo crear la cuenta del alumno.");

    // 2) Cuenta de la familia (solo lectura) — usa email real
    const { data: createdFam, error: fErr } = await supabaseAdmin.auth.admin.createUser({
      email: familyEmail,
      password: familyPwd,
      email_confirm: true,
      user_metadata: { display_name: `Familia de ${name}` },
    });
    if (fErr) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId).catch(() => {});
      throw fErr;
    }
    const familyUserId = createdFam.user?.id;
    if (!familyUserId) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId).catch(() => {});
      throw new Error("No se pudo crear la cuenta de familia.");
    }

    // 3) student_profile vincula ambos
    const { data: sp, error: spErr } = await supabaseAdmin
      .from("student_profiles")
      .insert({
        user_id: studentUserId,
        family_user_id: familyUserId,
        family_username: familyUsername,
        family_email: familyEmail,
        student_name: name,
        age,
        birth_date: birth,
        username,
        group_id: data.group_id,
      })
      .select("id")
      .single();
    if (spErr) {
      await supabaseAdmin.auth.admin.deleteUser(studentUserId).catch(() => {});
      await supabaseAdmin.auth.admin.deleteUser(familyUserId).catch(() => {});
      throw spErr;
    }

    await supabaseAdmin.from("skill_bars").upsert({ student_id: sp.id }, { onConflict: "student_id" });

    return {
      ok: true as const,
      student: { username, password: studentPwd },
      family: { username: familyUsername, password: familyPwd },
      student_id: sp.id,
    };
  });

/**
 * Resuelve un username (alumno o familia) al email interno correspondiente.
 * Público: lo usa el formulario de login para no exponer los dominios internos en el cliente.
 */
export const resolveLoginEmail = createServerFn({ method: "POST" })
  .inputValidator((d: { username: string }) => d)
  .handler(async ({ data }) => {
    const u = data.username.trim().toLowerCase();
    if (!USERNAME_RE.test(u)) return { ok: false as const, error: "Usuario inválido." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: asStudent } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .eq("username", u)
      .maybeSingle();
    if (asStudent) return { ok: true as const, email: `${u}@${STUDENT_DOMAIN}`, kind: "student" as const };

    const { data: asFamily } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .ilike("family_username", u)
      .maybeSingle();
    if (asFamily) return { ok: true as const, email: `${u}@${FAMILY_DOMAIN}`, kind: "family" as const };

    return { ok: false as const, error: "Usuario no encontrado." };
  });

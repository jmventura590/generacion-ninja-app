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

export const USERNAME_DOMAIN = "alumno.adn.local";

export const createStudentAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; birth_date: string; username: string; group_id: string | null }) => d)
  .handler(async ({ data, context }) => {
    // Autorización: solo coach
    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const isCoach = (roles ?? []).some((r: any) => r.role === "coach");
    if (!isCoach) throw new Error("Solo coaches pueden dar de alta alumnos.");

    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) throw new Error("Usuario inválido (3-24 letras/números/._-).");
    const name = data.name.trim();
    if (!name) throw new Error("Nombre requerido.");
    const birth = data.birth_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) throw new Error("Fecha de nacimiento inválida.");
    const age = ageFromBirth(birth);
    if (age < 4 || age > 18) throw new Error("Edad fuera de rango (4-18).");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // ¿usuario ya existe?
    const { data: dup } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dup) throw new Error("Ese usuario ya está en uso.");

    const password = genPassword(6);
    const email = `${username}@${USERNAME_DOMAIN}`;

    const { data: created, error: cErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: name },
    });
    if (cErr) throw cErr;
    const userId = created.user?.id;
    if (!userId) throw new Error("No se pudo crear el usuario.");

    const { data: sp, error: spErr } = await supabaseAdmin
      .from("student_profiles")
      .insert({
        user_id: userId,
        student_name: name,
        age,
        birth_date: birth,
        username,
        group_id: data.group_id,
      })
      .select("id")
      .single();
    if (spErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw spErr;
    }

    // skill_bars se inicializa por trigger handle_new_student, pero garantizamos:
    await supabaseAdmin.from("skill_bars").upsert({ student_id: sp.id }, { onConflict: "student_id" });

    return { ok: true as const, username, password, student_id: sp.id };
  });

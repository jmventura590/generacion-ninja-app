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
  .inputValidator((d: { name: string; birth_date: string; username: string; group_id: string | null; family_google_email?: string | null }) => d)
  .handler(async ({ data, context }) => {
    const fail = (msg: string) => ({ ok: false as const, error: msg });

    const { data: roles } = await context.supabase.from("user_roles").select("role").eq("user_id", context.userId);
    const isCoach = (roles ?? []).some((r: any) => r.role === "coach");
    if (!isCoach) return fail("Solo coaches pueden dar de alta alumnos.");

    const username = data.username.trim().toLowerCase();
    if (!/^[a-z0-9_.-]{3,24}$/.test(username)) return fail("Usuario inválido (3-24 letras/números/._-).");
    const name = data.name.trim();
    if (!name) return fail("Nombre requerido.");
    const birth = data.birth_date;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return fail("Fecha de nacimiento inválida.");
    const age = ageFromBirth(birth);
    if (age < 3 || age > 99) return fail("Edad fuera de rango. Verificá la fecha de nacimiento.");

    let familyEmail: string | null = null;
    if (data.family_google_email && data.family_google_email.trim()) {
      familyEmail = data.family_google_email.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(familyEmail)) return fail("Email de Google inválido.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: dup } = await supabaseAdmin
      .from("student_profiles")
      .select("id")
      .eq("username", username)
      .maybeSingle();
    if (dup) return fail("Ese usuario ya está en uso.");

    if (familyEmail) {
      const { data: dupEmail } = await supabaseAdmin
        .from("student_profiles")
        .select("id")
        .ilike("family_google_email", familyEmail)
        .maybeSingle();
      if (dupEmail) return fail("Ese email de Google ya está autorizado para otro alumno.");
    }

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
        family_google_email: familyEmail,
      })
      .select("id")
      .single();
    if (spErr) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      throw spErr;
    }

    await supabaseAdmin.from("skill_bars").upsert({ student_id: sp.id }, { onConflict: "student_id" });

    return { ok: true as const, username, password, student_id: sp.id };
  });

/**
 * Validación post-OAuth. Llamar inmediatamente después de signInWithOAuth("google").
 * - Si el email no está en la whitelist (familia autorizada por el coach) ni es coach,
 *   borra la cuenta recién creada y devuelve error.
 * - Si es familia autorizada, vincula family_user_id al student_profile.
 */
export const enforceGoogleWhitelist = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const fail = (msg: string) => ({ ok: false as const, error: msg });
    const userId = context.userId;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: u, error: uErr } = await supabaseAdmin.auth.admin.getUserById(userId);
    if (uErr || !u?.user) return fail("No se pudo verificar la cuenta.");
    const email = (u.user.email ?? "").toLowerCase();
    const provider = (u.user.app_metadata as any)?.provider ?? "";
    const providers: string[] = (u.user.app_metadata as any)?.providers ?? [];

    const isGoogle = provider === "google" || providers.includes("google");
    if (!isGoogle) return { ok: true as const };
    if (!email) return fail("La cuenta de Google no expone email.");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    const isCoach = (roles ?? []).some((r: any) => r.role === "coach");
    if (isCoach) return { ok: true as const };

    const { data: sp } = await supabaseAdmin
      .from("student_profiles")
      .select("id, family_user_id")
      .ilike("family_google_email", email)
      .maybeSingle();

    if (!sp) {
      await supabaseAdmin.auth.admin.deleteUser(userId).catch(() => {});
      return fail("Este email no está autorizado. Contactate con la administración de ADN Ninja.");
    }

    if (sp.family_user_id !== userId) {
      await supabaseAdmin
        .from("student_profiles")
        .update({ family_user_id: userId })
        .eq("id", sp.id);
    }
    return { ok: true as const };
  });

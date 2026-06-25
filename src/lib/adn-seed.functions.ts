import { createServerFn } from "@tanstack/react-start";

/**
 * Seeds 5 mock parent accounts + 1 coach + their students with varied XP so
 * the dashboards show different belts immediately. Idempotent.
 */
export const seedAdnDemo = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  // Idempotency: if there is already at least one student, skip.
  const existing = await supabaseAdmin.from("student_profiles").select("id", { count: "exact", head: true });
  if ((existing.count ?? 0) > 0) {
    return { ok: true, skipped: true as const };
  }

  // Look up class type IDs
  const { data: classes } = await supabaseAdmin.from("class_types").select("id, name");
  const byName = Object.fromEntries((classes ?? []).map((c) => [c.name, c.id])) as Record<string, string>;

  // 1) Coach
  const coachEmail = "coach@adn.test";
  const coachPwd = "Coach1986!";
  let coachId: string | undefined;
  {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: coachEmail,
      password: coachPwd,
      email_confirm: true,
      user_metadata: { role: "coach", display_name: "Coach ADN" },
    });
    if (error && !String(error.message).toLowerCase().includes("already")) throw error;
    coachId = data?.user?.id;
    if (!coachId) {
      const { data: lookup } = await supabaseAdmin.auth.admin.listUsers();
      coachId = lookup.users.find((u) => u.email === coachEmail)?.id;
    }
  }

  // 2) Parents + students with varied class history
  const parents = [
    { email: "benja@adn.test",   name: "Benja",   age: 8,  classes: 22 }, // → red
    { email: "cata@adn.test",    name: "Cata",    age: 10, classes: 12 }, // → blue
    { email: "morena@adn.test",  name: "Morena",  age: 7,  classes: 6  }, // → green
    { email: "bauti@adn.test",   name: "Bauti",   age: 12, classes: 3  }, // → white (almost green)
    { email: "fran@adn.test",    name: "Fran",    age: 9,  classes: 9  }, // → green
  ];
  const sharedPwd = "Ninja2026!";

  const classCycle = ["Muro Curvado", "Pasamanos", "Puente Colgante"];

  for (const p of parents) {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: p.email,
      password: sharedPwd,
      email_confirm: true,
      user_metadata: { display_name: p.name + " (familia)" },
    });
    if (error && !String(error.message).toLowerCase().includes("already")) throw error;
    const userId = data?.user?.id;
    if (!userId) continue;

    const { data: sp, error: spErr } = await supabaseAdmin
      .from("student_profiles")
      .insert({ user_id: userId, student_name: p.name, age: p.age })
      .select("id")
      .single();
    if (spErr) throw spErr;
    const studentId = sp.id;

    // Insert N class logs across the 3 class types on different past dates.
    const today = new Date();
    for (let i = 0; i < p.classes; i++) {
      const className = classCycle[i % 3];
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      await supabaseAdmin.from("attendance_logs").insert({
        student_id: studentId,
        class_type_id: byName[className],
        date: dateStr,
        coach_id: coachId ?? null,
      });
    }
  }

  return { ok: true, skipped: false as const };
});

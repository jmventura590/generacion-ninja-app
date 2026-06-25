
# Generación ADN — Plan

A new multi-role gamified PWA layered onto the current ADN Ninja Warrior project. Reuses the existing dark/neon aesthetic but introduces the new palette (#1e1e24 / #000 / #39ff14 / #df00ff / #fff), Supabase-backed data, a PIN-gated Coach Dashboard, and a Student/Parent Dashboard with avatar studio, skill bars, obstacle map and shop.

## Scope decisions to confirm

Before I build, two things I want to confirm so I don't waste your credits:

1. **Coexistence with current app**: keep the existing "Mi Camino Ninja" + "Reporte Mensual" tabs as-is and add Generación ADN as a separate top-level area (new routes `/adn/*`), OR fully replace the current app with Generación ADN. My plan assumes **add alongside** (safer, preserves yesterday's work).
2. **Auth model**: the spec says `users.password_hash` + role. The simplest production-safe option in Lovable Cloud is Supabase email/password auth + a `profiles` table with role, plus a separate hardcoded coach PIN gate (`1986`) as an extra in-app lock for the coach screen. I will NOT roll a custom password_hash table — that's an anti-pattern. Confirm OK.

If either of those is wrong, tell me and I'll revise before building.

## Architecture

- **Backend**: Enable Lovable Cloud (Supabase). All tables in `public` with RLS + GRANTs.
- **Roles**: stored in `user_roles` table with `app_role` enum (`coach`, `student_parent`) + `has_role()` security definer fn. Never on profile.
- **XP/belt logic**: SQL trigger on `attendance_logs` insert → distributes XP into `skill_bars`, recomputes `total_xp` and `current_belt_color` on `student_profiles`. Duplicate (student_id, date, class_type_id) blocked by unique index.
- **Frontend**: TanStack Start routes under `src/routes/adn/`. Mobile-first. Framer-motion-free; use CSS transitions for skill bars.
- **PWA**: manifest-only (installable + icons + theme color). No service worker unless you explicitly want offline.

## Database (migration)

```text
app_role            enum('coach','student_parent')
profiles            id(uuid=auth.users.id), display_name, created_at
user_roles          (user_id, role) unique
student_profiles    id, user_id→auth.users, student_name, age,
                    total_xp int default 0,
                    current_belt_color text default 'white'
skill_bars          student_id PK→student_profiles,
                    jump_xp, grip_xp, coordination_xp, agility_xp, strength_xp
class_types         id, name, xp_matrix jsonb   -- seeded with 3 classes
attendance_logs     id, student_id, class_type_id, date,
                    coach_id, xp_awarded int,
                    UNIQUE(student_id, date, class_type_id)
unlocked_items      id, student_id, item_type('pin'|'belt'),
                    item_name, purchased_status bool default false,
                    UNIQUE(student_id, item_type, item_name)
avatars             student_id PK, hair, skin, accessory jsonb
```

GRANTs on every table. RLS:
- `student_profiles`, `skill_bars`, `unlocked_items`, `avatars`: parent sees own; coach sees all (`has_role(auth.uid(),'coach')`).
- `attendance_logs`: insert only by coach; select own student or coach.
- `class_types`: read for authenticated.

Seed: 3 class_types + 5 mock students (Benja, Cata, Morena, Bauti, Fran) with varied XP so belts span White→Red on first load.

## Routes

```
/adn/                       -> role-aware landing (redirects to /adn/student or /adn/coach)
/adn/auth                   -> sign in / sign up (email + password)
/adn/coach                  -> _authenticated; PIN overlay (1986) before content
  ├ shift selector  (6-9 / 10-14)
  ├ class dropdown  (3 classes)
  ├ student roster checklist
  └ sticky "REGISTRAR ASISTENCIA DE CLASE"
/adn/student                -> _authenticated; tabs:
  ├ Avatar Studio
  ├ Evolution (belt + 5 skill bars)
  ├ Obstacle Map (3 cards w/ lock + unlock CTA)
  └ ADN Shop (read-only showcase)
```

Coach PIN: stored in `sessionStorage` for that tab session; gate overlay component blocks `/adn/coach/*` until matched.

## Game logic

- XP matrix lives in `class_types.xp_matrix` (e.g. `{"jump":50,"strength":50}`) → trigger reads it.
- Belt recompute on `student_profiles` via trigger: white<400, green<1000, blue<2000, red<4000, black≥4000.
- Obstacle unlocks computed client-side from `skill_bars` (≥150 in matched skill).
- On unlock, insert into `unlocked_items` (idempotent via UNIQUE).

## UI components

- New tokens in `src/styles.css` added under an `.adn-theme` scope (so the existing app keeps its current palette). Fluor green `#39ff14`, violet `#df00ff`, charcoal `#1e1e24`, ink black `#000`, white text.
- Skill bar = animated gradient (green→violet glow), recharts not needed.
- Avatar studio = flat SVG built from layered `<svg>` parts (no AI image gen — keeps it fast, free, and consistent). Boy/girl base + hair/skin pickers + fixed ADN green tee w/ violet trim.
- Obstacle cards = 3 newly-generated kid-friendly flat illustrations (boy on Muro Curvado, girl on Pasamanos, boy on Puente Colgante), greyscale when locked.

## PWA

Add `public/manifest.webmanifest` + 192/512 icons + head links in `__root.tsx`. No service worker.

## Testability

- After migration runs, you can log in with any of the 5 mock parent accounts (creds shown in `/adn/auth`) to see different belts & unlocks immediately.
- Coach login: one seeded coach (`coach@adn.test`) + PIN 1986.

## Out of scope (will not build unless you ask)

- Real payments / shop checkout.
- Push notifications.
- Offline service worker.
- Photo upload for avatars.

---

**Reply with:**
- "go" (or "dale") to build with the two assumptions above (add alongside; Supabase auth + PIN gate).
- Otherwise tell me what to change.

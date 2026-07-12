# Plan: sistema de avatares ADN — 6 correcciones

Alcance grande: ~30 operaciones de imagen + cambios de esquema + código. Antes de ejecutar quiero que apruebes el orden y confirmes el gasto de créditos de imagen.

## Resumen de decisiones ya tomadas
- **Franjas**: 6-7 = `kids`, 8-9 = `mid` (el set actual `teens` se renombra a `mid`), 10+ = `teens` (nuevo set de 10 avatares).
- **Auto-asignación**: por `class_group` del alta (se agrega columna `age_band` en `class_groups`).
- Coach puede overridear el avatar después.

## Cambios de esquema (1 migración)

```
ALTER TABLE class_groups ADD COLUMN age_band text
  CHECK (age_band IN ('kids','mid','teens'));
ALTER TABLE student_profiles ADD COLUMN avatar_id text;
```

Backfill: infiero `age_band` de cada `class_group` existente por su nombre (6-7, 8-9, 10+). Si algún grupo no matchea, queda `null` y el coach lo edita.

## Cambios de código

1. **AVATAR_PRESETS** (`src/routes/adn/student.tsx`)
   - Renombrar `band: "teens"` → `band: "mid"` en los 10 avatares actuales `t1–t5`, `tg1–tg5`.
   - Agregar 10 nuevos presets `n1–n5` (varón), `ng1–ng5` (mujer) con `band: "teens"`.
   - Agregar campos `name` y `quote` a cada preset (los 30 nombres/frases exactos que mandaste).
   - Al abrir el avatar mostrar `name` + `quote` (mismo modal "Personaje sorpresa").

2. **`createStudentAccount`** (`adn-students.functions.ts`)
   - Leer `age_band` del `class_group` elegido.
   - Elegir un `avatar_id` aleatorio del set correspondiente y guardarlo en `student_profiles.avatar_id`.

3. **Vista de coach** (`adn/coach.tsx`)
   - Al crear alumno mostrar la franja detectada.
   - Selector de avatar override.

4. **`LogoOverlay`** (`student.tsx`)
   - Aumentar tamaño/opacidad del logo en remera para tapar el "ADN" pintado en el PNG hasta que se regeneren.
   - Agregar overlay de logo también en la muñequera (ya está en `wristband` y `wristband-thumb`, verifico tamaño).

## Operaciones de imagen (créditos ⚠️)

**Edición de 20 avatares existentes** (`b1-b5`, `g1-g5`, `t1-t5`, `tg1-tg5`) — para cada uno vía `imagegen--edit_image`:
- Borrar el texto "LA PLATA GOBIERRO" y los pequeños escudos de la pared turquesa (dejarla lisa).
- Borrar todos los destellos/chispas/líneas/cotillón alrededor del personaje.
- Borrar el texto "ADN" de la remera (queda remera negra lisa; el logo se pinta encima por CSS con `LogoOverlay`).

**Generación de 10 avatares nuevos** (`n1-n5` varón, `ng1-ng5` mujer) para franja 10+ (`teens`):
- Estilo cartoon consistente con los sets existentes.
- Look adolescente (proporciones más grandes, más "teen"), remera negra lisa, escenario limpio sin texto, sin efectos, cuerpo entero, pies apoyados.

**Total: ~30 llamadas de imagegen.**

## Orden de ejecución

1. Migración (`age_band` + `avatar_id`) + backfill de grupos existentes.
2. Refactor de `AVATAR_PRESETS`: rename band, agregar `name`/`quote`, agregar 10 slots teens con placeholders temporales.
3. Auto-asignación por franja en `createStudentAccount`.
4. UI: modal con nombre + frase, selector de override en coach.
5. Edición imagen: 20 avatares existentes (limpieza pared + efectos + texto ADN).
6. Generación imagen: 10 avatares teens 10+.
7. QA con Playwright loggeado con cuenta coach y student, capturas y verifico:
   - Logo visible y centrado en remera y muñequera de las 3 franjas.
   - Pared turquesa lisa, sin texto.
   - Sin destellos alrededor.
   - Modal muestra nombre + frase correcta.
   - Alta de alumno auto-elige avatar según franja del grupo.

## Riesgos / notas honestas

- **Créditos**: 30 operaciones imagegen es lo más caro que hicimos hasta ahora en este proyecto. Si algún avatar sale mal y hay que reintentar, sube más.
- **Consistencia visual**: al editar 20 PNGs distintos con un mismo prompt, el modelo puede alterar detalles del personaje. Reviso cada uno y reintento solo los que rompan al personaje (no barrido total).
- **Backfill grupos**: si tenés grupos con nombres raros que no coincidan con 6-7 / 8-9 / 10+, los dejo en `null` y te paso la lista para que los completes desde coach.

## ¿Confirmás?

Si aprobás, arranco por el orden 1-4 (cambios baratos), y antes de disparar los 30 image ops (pasos 5-6) te aviso para dar OK final al gasto.

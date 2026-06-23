# Plan — Reporte Mensual + tareas guardadas para mañana

## Parte 1 — Guardar para mañana (memoria del proyecto)

Voy a guardar en la memoria del proyecto (`mem://`) las correcciones pendientes de los dibujos de obstáculos para retomarlas mañana sin perder contexto:

- **Estilo general**: ilustraciones tipo dibujo infantil (es app para nenes), no vectores planos abstractos.
- **5 Escalones**: regenerar como 5 tarimas/cajones separados para saltar (no una escalera continua).
- **Escalera Invertida**: escalera en forma de V invertida (∧), se cruza colgándose con los brazos.
- **Muro Curvado**: debe estar parado/vertical (warped wall clásico), no acostado.
- **Salto de la Araña**: chico trepando entre dos paredes con manos y pies apoyados en los laterales.
- **OK como están**: Pasamanos, Palestra, Tronco Giratorio, Pegboard, Escalar con Anillas, Pelotas Colgantes.

Archivos de memoria a crear:
- `mem://index.md` — índice del proyecto con regla core "estilo dibujo infantil".
- `mem://design/obstacle-illustrations.md` — detalle de las 5 correcciones pendientes.

## Parte 2 — Construir hoy: Tab "Reporte Mensual"

Reescribir `src/routes/report.tsx` con todo el contenido real, manteniendo la estética dark + neón:

### Estructura

1. **Selector de mes** (arriba): dropdown shadcn `Select` con opciones "Mayo 2026", "Abril 2026", "Marzo 2026". Estado local con `useState`.

2. **Tarjetas de compromiso** (grid de 2 columnas):
   - Card "Asistencia" → "8 / 8 Clases asistidas" + badge "¡Asistencia Perfecta! 🌟" en neón verde.
   - Card "Tiempo de Movimiento" → "480 min" + subtítulo "de desarrollo motor" en azul eléctrico.

3. **Radar Chart** (Recharts, ya instalado vía `src/components/ui/chart.tsx`):
   - 7 ejes: Fuerza, Salto, Agarre, Equilibrio, Coordinación, Resistencia, Velocidad.
   - Valores demo coherentes con asistencia perfecta (~70-90 por eje).
   - Relleno semi-transparente azul eléctrico (`var(--electric)` con alpha), borde sólido neón.
   - Grilla y labels en tonos sutiles sobre fondo oscuro.
   - Envuelto en una card con título "Capacidades Físicas Estimuladas".

4. **Disclaimer footer**: bloque de texto al final de la página (no fixed, para no tapar la bottom nav que ya es fixed) con el copy exacto: *"Este reporte traduce la asistencia de tu hijo en capacidades físicas estimuladas. En ADN promovemos la salud integral a través del juego y el desafío adaptado."* — tipografía pequeña, color muted, borde sutil.

### Detalles técnicos

- Usar `ChartContainer` + `RadarChart`/`PolarGrid`/`PolarAngleAxis`/`Radar` de Recharts.
- Datos demo por mes en un objeto `MONTHLY_DATA` para que el dropdown cambie valores realmente.
- Sin backend — todo client-side mock data (consistente con el resto de la app).
- Actualizar `head()` con título/description en castellano (ya está en castellano, lo mantengo).
- Transiciones suaves al cambiar de mes (fade del radar via key remount o animación nativa de Recharts).

### Archivos

- **Editar** `src/routes/report.tsx` — reemplazo completo del stub actual.
- **Crear** `mem://index.md` y `mem://design/obstacle-illustrations.md`.

No se toca `src/routes/index.tsx`, `AppShell.tsx`, ni los assets de obstáculos (eso queda para mañana).

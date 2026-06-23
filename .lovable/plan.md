# Plan — Regenerar 4 ilustraciones de obstáculos

Regenerar los 4 PNG existentes en `src/assets/obstacles/` con estilo **dibujo infantil a mano** (crayón/marcador, líneas suaves, colores vivos sobre fondo oscuro neutro coherente con la app), respetando la forma real de cada obstáculo del programa Ninja Warrior. No se tocan `index.tsx`, `AppShell.tsx` ni los otros 6 obstáculos.

## Imágenes a regenerar

1. **`escalones.png` — 5 Escalones**
   Cinco tarimas/cajones cuadrados **separados** entre sí, alineados en fila con altura creciente y luego decreciente (formato pirámide típico de Ninja Warrior). Un nene saltando de uno al otro. NO una escalera continua.

2. **`escalera.png` — Escalera Invertida**
   Escalera en forma de **V invertida (∧)**, suspendida, con peldaños horizontales. Un nene colgando de los peldaños con los brazos, cruzándola por debajo. Los pies no tocan el piso.

3. **`muro.png` — Muro Curvado (Warped Wall)**
   Muro **vertical/parado**, curvado hacia atrás en la parte superior (rampa cóncava clásica warped wall). Un nene corriendo hacia él / trepando. NO acostado en el piso.

4. **`arana.png` — Salto de la Araña (Spider Walk)**
   Dos paredes paralelas verticales formando un corredor. Un nene suspendido entre ellas con **manos y pies apoyados en los laterales opuestos**, cuerpo en horizontal sobre el vacío. Estilo spider-man entre paredes.

## Estilo común (prompt base)

- Ilustración infantil tipo dibujo a mano con marcador/crayón, trazos amigables y redondeados.
- Personaje: nene con vincha ninja, sonriendo, proporciones tipo caricatura.
- Paleta: acentos en **verde neón** y **azul eléctrico**, fondo **oscuro #121212** plano para integrarse con la app.
- Composición centrada, cuadrada 1024×1024, sin texto ni marcas de agua.
- Coherente entre las 4 (mismo personaje, mismo trazo, misma paleta).

## Pasos técnicos

1. Generar las 4 imágenes en paralelo con `imagegen--generate_image` (tier `standard` para mejor fidelidad de forma) sobrescribiendo los archivos existentes en `src/assets/obstacles/`.
2. Verificar visualmente abriendo el preview.
3. Actualizar `mem://design/obstacle-illustrations.md` marcando la tarea como completada (o eliminarla del índice).

No se requieren cambios de código.

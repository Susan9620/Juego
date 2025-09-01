# Mini Juegos

Hub de minijuegos web (móvil y desktop) con estética oscura + neón. Incluye, entre otros:

- **Love Crush** (match-3 con objetivos, vidas y boosters)
- Otros títulos como **Snake Xenzia**, **Disparos**, etc.

Está optimizado para **pantalla táctil** y es **instalable como PWA** (añadir a pantalla de inicio / favoritos).

---

## ✨ Características principales

- 🎮 **Varios juegos** en una sola app.
- 📱 **PWA**: instalable en Android/Chrome, iOS/Safari y desktop.
- 🖼️ **Assets remotos** (Cloudinary u otro CDN) para imágenes y audio.
- ☁️ **Marcador en la nube (opcional)**: reporte de runs a una API.
- 🎚️ **UI** con chips/píldoras, sombras suaves y gradiente oscuro.

### Love Crush (resumen de mecánicas)
- **Objetivos por nivel**: `puntuacion`, `besos`, `osos`.
- **Vidas**: 5 (pierdes 1 cuando se agotan movimientos sin cumplir objetivo).
- **Movimientos restantes → bonus**: al cumplir el objetivo, los movimientos restantes se convierten en **corazones envueltos** que explotan automáticamente antes del cierre del nivel.
- **Puntaje**:
  - `puntaje` = del nivel actual (se reinicia si pierdes la vida o reinicias).
  - `puntajeAcumulado` = suma de niveles **superados**; también se suma el del último nivel **solo** si es Game Over o juego completado.
- **Sin movimientos posibles**: el tablero se **baraja** automáticamente sin penalización.
- **Boosters**:
  - **Cupido**: elimina una pieza (activa efecto si es especial).
  - **Mano**: intercambia dos adyacentes sin exigir match.
  - **Bombón**: seleccionas un color y limpia todo ese color.
- **Obstáculos/objetivos**: piedra, nube (con vida), beso (caída controlada), oso (emparejamiento adyacente por tipo).

---

## 🧱 Estructura (archivos principales)

> Los nombres pueden variar; estos son los más comunes en este proyecto.


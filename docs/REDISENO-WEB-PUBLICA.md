# Rediseño esports profesional de QU4SAR (web pública)

> Estado: PLAN aprobado · fecha: 2026-08-01

## 1. Objetivo

Transformar la web pública de QU4SAR de una página simple a una web esports
profesional, tomando como referencia visual **https://zero2hero.gg/**, pero
**conservando la identidad QU4SAR** (acento violeta `#8B5CF6`, fondo oscuro
`#0A0A0A`, tipografías Orbitron/Inter/Valorant, logo `qu4sar.ico`).

Regla de oro: **solo se mueve el estilo (presentación/HTML/CSS). No se toca
core, lógica de negocio ni funcionamientos** (auth, pagos, RLS, rutas del
dashboard, migraciones, etc.).

## 2. Referencia: zero2hero.gg (estructura a imitar)

Secciones, en orden:

1. `discord-banner` — cintillo superior con punto verde "live" y CTA "Unirse →"
2. `nav-b` — navbar fija: logo + links por ancla (`#coaches`, `#offers`,
   `#comunidad`, `#faq`) + selector idioma + CTA "Reserva tu clase →" +
   menú hamburguesa (drawer) en móvil.
3. `hero-vs` — hero centrado con kicker, H1 gigante con palabra acentuada,
   subtítulo, micro-detalles (ranks/idiomas), 2 CTAs y partículas flotantes
   (`embers`) de fondo.
4. `vidpanel` — panel de "briefing" con esquinas HUD y cita lateral.
5. `coach-card` (roster) — tarjetas con poster/imagen, esquinas
   (`● COACH · VAL 2026`), credenciales, tagline, meta (rank/idiomas), CTA.
6. `offer-card` — tarjetas de precio con badge (`Best seller`/`Mejor valor`),
   blurb, lista de features, modo (`Online · Discord`), CTA.
7. `features` — grid "QUÉ INCLUYE" con tags (EN VIVO / ASYNC / AUTOGUIADO…).
8. `community` — split copy + perks (canales Discord) + CTA.
9. `equotes` — testimonios tipo cita con nickname + delta de divs.
10. `faq-b` — acordeón (details/summary) Q·01…Q·05.
11. `outro` — titular grande + CTAs.
12. `foot-b` — footer en columnas (Coaches, Clases, Comunidad, Síguenos, Legal)
    + copyright.

Estilo: tema oscuro total (`#050505`), etiquetas en mayúsculas con color de
acento, esquinas HUD, grillas densas **sin espacios en blanco**, entrada con
delay escalonado (`--i`), animaciones sutiles.

## 3. Adaptación a QU4SAR

| zero2hero        | QU4SAR                                       |
|------------------|----------------------------------------------|
| Acento rojo Valorant | Violeta `#8B5CF6` (identidad)             |
| Coaches (roster) | Cursos por rango (Rookie → Pro)              |
| Offers (clases)  | Precios: Posicionamiento Gratis + Cursos $15 |
| Comunidad Discord| Mismo Discord real de QU4SAR                  |
| Briefing video   | Poster `qu4sarfondoPublico.png` + cita (play; mp4 pendiente) |
| Testimonios/FAQ  | Placeholders editables en español con voz QU4SAR |

Cambios explícitos sobre el estado actual:
- **Eliminar** el botón "Comienza ahora" del hero.
- **Subir las olas** (transición de olas SVG más arriba; hero compacto).
- Navbar/footer **compartidos** en toda la web pública (hoy duplicados en cada
  página).

## 4. Archivos a crear

- `src/b3b32a/shared/public_nav.ts` — cintillo Discord + navbar (desktop/móvil)
  + footer compartidos + `mountPublicNav()` (swap botones según sesión).
- `src/b3b32a/shared/public_css.ts` — o ampliar CSS principal: utilidades
  `lbl`, esquinas HUD (`br-tl`…), animación `embers`, tarjetas
  roster/precio/feature/testimonio/FAQ, delay `--i`, drawer móvil.

## 5. Archivos a editar

| Archivo | Qué se cambia |
|---------|---------------|
| `src/b3b32a/106a6c.ts` | Reestructurar `renderHome()`: hero compacto (sin "Comienza ahora", olas subidas), roster=cursos, briefing, precios, comunidad, testimonios, FAQ, outro. Usar navbar/footer compartidos. |
| `src/b3b32a/9e81e7/about.ts` | Navbar compartida + unificar estética. |
| `src/fa53b9/d56b69.ts` (login) | Navbar compartida. |
| `src/fa53b9/9de4a9.ts` (register) | Navbar compartida. |
| `src/fa53b9/037c60.ts` (reset-password) | Navbar compartida. |
| `src/b3b32a/9e81e7/90b027.ts` (perfil público) | Header a estética compartida. |
| `src/fad58d.ts` | Ajustar imports/mount para sesión en páginas públicas. |
| `src/bc4150/0c54ed.css` | Utilidades nuevas del rediseño. |

> Nota: el contenido/lógica de login, register, reset-password y perfil público
> **no se modifica**; solo su presentación (navbar/envuelto visual).

## 6. Datos

- Cursos (precios/ranks/duration/display_order): de Supabase `courses`
  (los precios ya están en $15).
- Avatares/fotos: se reutilizan assets existentes
  (`qu4sar.ico`, `qu4sar.svg`, `qu4sarfondoPublico.png`) y avatares reales de
  `profiles` (members/share_slug) donde aplique.
- Testimonios y FAQ: contenidos placeholder editables en
  `src/b3b32a/106a6c.ts` (fáciles de localizar).

## 7. Backup de git (creado ANTES de tocar nada)

- **Rama:** `backup-pre-rediseno`
- **Tag:** `pre-rediseno-20260801-020035`
- **Commit base:** `6a1f0f5` (árbol de trabajo limpio; incluye cambios de
  precios $15 y limpieza `e.txt`)
- Cómo revertir todo:
  ```bash
  git checkout pre-rediseno-20260801-020035
  ```
  o seguir trabajando en la rama `backup-pre-rediseno`.

## 8. Verificación

- `npm run build` (debe compilar sin errores de tipos).
- `npm run dev` y revisar: `/`, `/about`, `/login`, `/register`, `/reset-password`,
  `/p/...` — responsive (navbar drawer) y sin regresión de funcionalidad.

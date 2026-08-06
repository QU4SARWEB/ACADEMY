# Llamadas QU4SAR

Las llamadas usan LiveKit Cloud para transportar audio, video y pantalla. Supabase solo guarda la agenda, los permisos y genera tokens temporales desde la Edge Function.

## Configuración

Configura estos secrets en Supabase, nunca en `src` ni en `.env` publicado:

- `LIVEKIT_URL`: URL WebSocket `wss://...livekit.cloud`
- `LIVEKIT_API_KEY`: API key del proyecto
- `LIVEKIT_API_SECRET`: API secret del proyecto

Desde la raíz del proyecto:

```bash
npx supabase secrets set --project-ref cgusgmmkthpuwkkghvfu LIVEKIT_URL="wss://...livekit.cloud" LIVEKIT_API_KEY="..." LIVEKIT_API_SECRET="..."
npx supabase functions deploy livekit-token --project-ref cgusgmmkthpuwkkghvfu
```

Aplica `supabase/migrations/20260806000001_call_rooms.sql` desde el SQL Editor o con `supabase db push` después de vincular el proyecto real.

## Funcionalidad

- Sesiones personalizadas en fechas y horas distintas.
- Series semanales con varios días y una misma hora.
- Un mismo enlace persistente por sala.
- Permisos por coach, curso, inscripción e invitación.
- Micrófono, cámara, compartir pantalla y audio de pantalla.
- Realtime para cambios de agenda y notificaciones.

# QU4SAR Academy

SPA de gestión académica para QU4SAR Gaming Academy. Vanilla TypeScript + Vite + Supabase.

## Stack

- **Frontend:** TypeScript, Vite, Tailwind CSS v4
- **Backend:** Supabase (Auth, Database, Storage, Realtime)
- **Deploy:** GitHub Pages (Actions)

## Comandos

```bash
npm run dev      # Servidor local en :5500
npm run build    # Build producción → dist/
npm run preview  # Vista previa del build
```

## Rutas principales

| Ruta | Descripción |
|------|-------------|
| `/` | Landing page |
| `/login` / `/register` | Auth |
| `/p/:slug` | Perfiles públicos |
| `/students/*` | Panel estudiantes |
| `/coaches/*` | Panel coaches |
| `/players/*` | Panel jugadores |
| `/payments` | Pagos (PayPal) |
| `/members` | Directorio de miembros |
| `/chat` | Mensajería en tiempo real |

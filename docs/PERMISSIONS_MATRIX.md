# QU4SAR WEB V2 — Permissions Matrix

> Matriz de permisos por rol y tabla.
> Basada en Row Level Security (RLS) de Supabase.

---

## 1. Convenciones

| Símbolo | Significado |
|---|---|
| ✅ | Permiso concedido |
| ❌ | Sin acceso |
| 🟡 | Condicional (RLS policy) |
| — | No aplica |

### Roles

| Rol | Abreviatura |
|---|---|
| Public (sin auth) | `pub` |
| Student | `stu` |
| Player | `ply` |
| Coach | `coa` |

---

## 2. Matriz por Tabla

### 2.1 `profiles`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | 🟡 (solo público) | 🟡 (propio) | 🟡 (propio) | ✅ (todos) |
| **INSERT** | ❌ | 🟡 (propio, solo signup) | 🟡 (propio, solo signup) | ❌ |
| **UPDATE** | ❌ | 🟡 (propio, campos no-rol) | 🟡 (propio, campos no-rol) | ✅ (todos) |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

**Políticas RLS:**
- `pub`: Solo perfiles con `public_profiles.is_public = true`
- `stu/ply`: `profile_id = auth.uid()`
- `coa`: `auth.role() = 'coach'`

### 2.2 `seasons`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ | ✅ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.3 `courses`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ✅ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.4 `course_modules`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.5 `materials`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.6 `enrollments`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.7 `evaluations`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.8 `evaluation_results`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.9 `exams`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.10 `exam_results`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.11 `tasks`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ (enrolled) | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.12 `task_submissions`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | ❌ | ✅ |
| **INSERT** | ❌ | 🟡 (propio, solo submit) | ❌ | ❌ |
| **UPDATE** | ❌ | 🟡 (propio, antes de review) | ❌ | ✅ (grading) |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.13 `attendance`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | 🟡 (propio) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.14 `schedules`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (academic) | 🟡 (competitive) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.15 `teams`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ❌ | ✅ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.16 `team_members`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ❌ | 🟡 (propio team) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.17 `scrims`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ❌ | 🟡 (propio team) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.18 `scrim_participants`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ❌ | 🟡 (propio) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.19 `payments`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propio) | 🟡 (propio) | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.20 `notifications`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (propias) | 🟡 (propias) | 🟡 (propias) |
| **INSERT** | ❌ | ❌ | ❌ | 🟡 (sistema) |
| **UPDATE** | ❌ | 🟡 (marcar leída) | 🟡 (marcar leída) | 🟡 (marcar leída) |
| **DELETE** | ❌ | ❌ | ❌ | ❌ |

### 2.21 `audit_logs`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ❌ | ❌ | ✅ |
| **INSERT** | ❌ | 🟡 (automático sistema) | 🟡 (automático sistema) | 🟡 (automático sistema) |
| **UPDATE** | ❌ | ❌ | ❌ | ❌ |
| **DELETE** | ❌ | ❌ | ❌ | ❌ |

### 2.22 `public_profiles`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ✅ | ✅ | ✅ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | 🟡 (automático) |
| **UPDATE** | ❌ | 🟡 (propio) | 🟡 (propio) | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.23 `promotion_requirements`

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | ✅ | ❌ | ✅ |
| **INSERT** | ❌ | ❌ | ❌ | ✅ |
| **UPDATE** | ❌ | ❌ | ❌ | ✅ |
| **DELETE** | ❌ | ❌ | ❌ | ✅ |

### 2.24 `mails` (Futuro)

| Operación | pub | stu | ply | coa |
|---|---|---|---|---|
| **SELECT** | ❌ | 🟡 (involucrado) | 🟡 (involucrado) | 🟡 (involucrado) |
| **INSERT** | ❌ | ✅ | ✅ | ✅ |
| **UPDATE** | ❌ | 🟡 (marcar leído) | 🟡 (marcar leído) | 🟡 (marcar leído) |
| **DELETE** | ❌ | ❌ | ❌ | ❌ |

---

## 3. Storage Permissions

### 3.1 Buckets

| Bucket | Público | Política |
|---|---|---|
| `avatars` | ✅ | Lectura pública. Escritura: propio usuario o coach. |
| `banners` | ✅ | Lectura pública. Escritura: propio usuario o coach. |
| `tasks` | ❌ | Lectura: coach o propio estudiante. Escritura: propio estudiante o coach. |
| `materials` | ❌ | Lectura: estudiantes inscritos o coach. Escritura: solo coach. |
| `certificates` | ❌ | Lectura: propio estudiante o coach. Escritura: sistema. |
| `public-profiles` | ✅ | Lectura pública. Escritura: propio usuario o coach. |

### 3.2 Storage Folder Structure

```
avatars/{user_id}.{ext}
banners/{user_id}.{ext}
tasks/{task_id}/{submission_id}/{file}
materials/{module_id}/{file}
certificates/{user_id}_{season_id}.png
public-profiles/{slug}.png
```

---

> **Documentos relacionados:**
> - `SECURITY_MODEL.md` — Implementación de RLS + políticas
> - `DATABASE_SCHEMA.md` — Esquema de base de datos
> - `ROUTES_MAP.md` — Protección de rutas por rol

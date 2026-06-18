# Chat Architecture — QU4SAR

> Fase 7.0: Diseño previo a implementación.

---

## 1. Objetivo

Reemplazar el sistema actual de mensajería (`/mail`) por un chat moderno tipo WhatsApp/Discord con:

- Conversaciones 1:1 y grupales
- Mensajes en tiempo real
- Adjuntos (imágenes, PDFs, documentos)
- Búsqueda de usuarios
- Borradores automáticos

---

## 2. Tablas

### conversations

```sql
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### conversation_participants

```sql
CREATE TABLE conversation_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  last_read_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(conversation_id, profile_id)
);
```

### messages

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT,
  attachment_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Indexes

```sql
CREATE INDEX idx_cpart_conv ON conversation_participants(conversation_id);
CREATE INDEX idx_cpart_profile ON conversation_participants(profile_id);
CREATE INDEX idx_messages_conv ON messages(conversation_id);
CREATE INDEX idx_messages_created ON messages(created_at);
```

---

## 4. RLS Policies

```sql
-- conversations: participants can see
CREATE POLICY "view_own_conversations" ON conversations FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = id AND profile_id = auth.uid())
);
CREATE POLICY "insert_conversations" ON conversations FOR INSERT WITH CHECK (true);

-- participants: own only
CREATE POLICY "view_own_participants" ON conversation_participants FOR SELECT USING (
  profile_id = auth.uid()
);
CREATE POLICY "insert_participants" ON conversation_participants FOR INSERT WITH CHECK (
  auth.uid() IN (SELECT profile_id FROM conversation_participants WHERE conversation_id = conversation_id)
  OR public.is_coach()
);

-- messages: participants can see & insert
CREATE POLICY "view_conv_messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid())
);
CREATE POLICY "insert_own_messages" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid() AND EXISTS (SELECT 1 FROM conversation_participants WHERE conversation_id = messages.conversation_id AND profile_id = auth.uid())
);
```

---

## 5. Frontend

### Reemplazar `/mail` → `/chat`

| Ruta actual | Ruta nueva | Archivo |
|-------------|------------|---------|
| `/mail` | `/chat` | `src/b3b32a/9e81e7/chat.ts` |

### Layout

```
┌──────────────────────────────────────────┐
│  Sidebar  │  Chat App                    │
│           │──────────────────────────────│
│           │  Lista        │  Mensajes    │
│           │  Conversas    │              │
│           │  ┌────────┐  │  ┌──────────┐│
│           │  │ Usuario │  │  │ Burbuja  ││
│           │  │ Último  │  │  │          ││
│           │  └────────┘  │  └──────────┘│
│           │  ┌────────┐  │  ┌──────────┐│
│           │  │ Usuario │  │  │ Burbuja  ││
│           │  └────────┘  │  │          ││
│           │              │  └──────────┘│
│           │  [+ Nueva]   │  ┌──────────┐│
│           │              │  │ Input    ││
│           │              │  │ [📎][🗨️] ││
│           │              │  └──────────┘│
└──────────────────────────────────────────┘
```

### Componentes

Todos en un solo archivo (`chat.ts`) siguiendo el patrón del proyecto:

```
renderChat()        → HTML completo
initChat()          → init principal
loadConversations() → carga lista
loadMessages()      → carga mensajes de una conversación
sendMessage()       → envía mensaje + adjunto
startConversation() → nueva conversación
```

### Realtime

```typescript
supabase.channel('chat-realtime')
  .on('postgres_changes',
    { event: 'INSERT', schema: 'public', table: 'messages',
      filter: `conversation_id=eq.${activeConvId}` },
    () => loadMessages(activeConvId)
  )
  .subscribe()
```

---

## 6. Reutilización de componentes existentes

| Componente | Dónde usarlo en chat |
|------------|---------------------|
| `FileDropzone` | Adjuntar archivos al mensaje |
| `SearchableSelect` | Buscar usuarios al crear conversación |
| `Icon` | Botones de acción, emojis |
| `formatDate` | Timestamps de mensajes |
| `escapeHtml` | Sanitizar contenido |

---

## 7. Flujo de usuario

### Crear conversación

1. Usuario hace clic en "Nueva conversación"
2. Modal con `SearchableSelect` para buscar destinatario
3. Selecciona usuario → se crea `conversations` + `conversation_participants`
4. Se abre la conversación en el panel derecho

### Enviar mensaje

1. Usuario escribe en `MessageInput`
2. Opcional: adjunta archivo vía `FileDropzone`
3. Enter o clic en enviar → INSERT en `messages`
4. Realtime dispara actualización en destino

### Recibir mensaje

1. Realtime channel detecta INSERT en `messages`
2. Si la conversación está activa → append burbuja
3. Si no → actualizar contador + lista de conversaciones

---

## 8. Borradores (Fase 7.2)

```typescript
// Guardar en localStorage
localStorage.setItem(`draft_${convId}`, inputValue)

// Recuperar al abrir conversación
const draft = localStorage.getItem(`draft_${convId}`)
if (draft) input.value = draft

// Limpiar al enviar
localStorage.removeItem(`draft_${convId}`)
```

---

## 9. Migración desde mensajería actual

No hay migración de datos. Las tablas `messages` y `message_recipients` legacy se mantienen intactas pero dejan de usarse. Se pueden eliminar en una versión futura.

---

## 10. Orden de implementación

```
Fase 7.0  ✅ CHAT_ARCHITECTURE.md
Fase 7.1  Tablas + layout + enviar/recibir mensajes + adjuntos
Fase 7.2  Emoji picker + borradores + typing indicator + unread count
```

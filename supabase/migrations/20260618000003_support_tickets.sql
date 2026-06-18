-- Fase 6: Sistema de Tickets/Soporte
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS ticket_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tickets_profile ON support_tickets(profile_id);
CREATE INDEX IF NOT EXISTS idx_tickets_status ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_responses_ticket ON ticket_responses(ticket_id);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;

-- RLS: coaches can see all, others see own
CREATE POLICY "view_own_tickets" ON support_tickets FOR SELECT USING (profile_id = auth.uid() OR public.is_coach());
CREATE POLICY "insert_own_tickets" ON support_tickets FOR INSERT WITH CHECK (profile_id = auth.uid());
CREATE POLICY "coaches_update_tickets" ON support_tickets FOR UPDATE USING (public.is_coach());

CREATE POLICY "view_ticket_responses" ON ticket_responses FOR SELECT USING (
  EXISTS (SELECT 1 FROM support_tickets WHERE id = ticket_id AND (profile_id = auth.uid() OR public.is_coach()))
);
CREATE POLICY "insert_ticket_responses" ON ticket_responses FOR INSERT WITH CHECK (
  profile_id = auth.uid() OR public.is_coach()
);

CREATE TRIGGER set_updated_at_tickets BEFORE UPDATE ON support_tickets FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();

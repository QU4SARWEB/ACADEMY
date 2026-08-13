-- Fechas de vencimiento explícitas por pago (sistema robusto, corte fijo).
-- due_at:     fecha límite de pago (renovación, día 2 del mes).
-- expires_at: corte duro con 3 días de gracia (día 5 del mes de due_at).
alter table public.payments
  add column if not exists due_at timestamptz,
  add column if not exists expires_at timestamptz;

create index if not exists idx_payments_due_at on public.payments(due_at);
create index if not exists idx_payments_expires_at on public.payments(expires_at);

-- Backfill: a los pagos activos (pending/paid/scholarship) se les calcula el
-- próximo ciclo (día 2) con su corte (día 5) a partir de hoy.
do $$
declare
  d date := current_date;
  day int := extract(day from d);
  next_2 date;
begin
  next_2 := (date_trunc('month', d) + case when day < 2 then interval '0' else interval '1 month' end + interval '1 day')::date;
  update public.payments
     set due_at = next_2,
         expires_at = next_2 + 3,
         updated_at = now()
   where status in ('pending', 'paid', 'scholarship')
     and (due_at is null or expires_at is null);
end $$;

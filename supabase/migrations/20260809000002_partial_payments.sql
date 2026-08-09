-- Abonos parciales: moneda del pago, monto pagado en esa moneda y total abonado en USD.
-- Deuda restante = payments.amount (precio del curso en USD) - payments.paid_usd
alter table public.payments
  add column if not exists currency text not null default 'USD',
  add column if not exists paid_amount numeric,
  add column if not exists paid_usd numeric not null default 0;
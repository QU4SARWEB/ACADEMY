-- Automatiza el ciclo de vida de los pagos sin depender de que el usuario entre.
-- paid    -> pending cuando now() >= due_at    (se venció la renovación)
-- pending -> expired cuando now() >= expires_at (corte con 3 días de gracia)
create extension if not exists pg_cron;

create or replace function public.rollover_payments()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.payments
     set status = 'pending',
         updated_at = now()
   where status = 'paid'
     and due_at is not null
     and due_at <= now();

  update public.payments
     set status = 'expired',
         updated_at = now()
   where status = 'pending'
     and expires_at is not null
     and expires_at <= now();
end $$;

-- Idempotente: re-schedule limpio si ya existe el job con el mismo nombre.
select cron.unschedule(jobid)
  from cron.job
 where jobname = 'rollover-payments';

select cron.schedule('rollover-payments', '*/5 * * * *', 'select public.rollover_payments()');

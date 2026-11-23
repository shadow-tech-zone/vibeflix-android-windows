-- Monotonic, server-checked My List writes for multi-device synchronization.
-- RLS and the existing per-user table privileges remain in force.

create or replace function public.vibeflix_guard_my_list_client_time()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.client_updated_at > statement_timestamp() + interval '5 minutes' then
    raise exception using
      errcode = '22007',
      message = 'client_updated_at is too far in the future';
  end if;

  -- Keep the stored state when a delayed/offline device submits an older or
  -- equal timestamp. Returning NULL skips this row update atomically.
  if tg_op = 'UPDATE' and new.client_updated_at <= old.client_updated_at then
    return null;
  end if;

  return new;
end;
$$;

create trigger my_list_guard_client_time
  before insert or update on public.my_list
  for each row execute function public.vibeflix_guard_my_list_client_time();

-- Trigger functions are invoked by their attached triggers; clients never call
-- this helper directly.
revoke all on function public.vibeflix_guard_my_list_client_time()
  from public, anon, authenticated;

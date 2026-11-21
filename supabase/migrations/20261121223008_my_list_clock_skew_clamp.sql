-- Avoid letting a device clock far in the future block later My List updates.
-- Small skew is tolerated; timestamps more than five minutes ahead are clamped
-- to the server statement time before the monotonic stale-write check.

create or replace function public.vibeflix_guard_my_list_client_time()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.client_updated_at > statement_timestamp() + interval '5 minutes' then
    new.client_updated_at := statement_timestamp();
  end if;

  -- Keep the stored state when a delayed/offline device submits an older or
  -- equal timestamp. Returning NULL skips this row update atomically.
  if tg_op = 'UPDATE' and new.client_updated_at <= old.client_updated_at then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.vibeflix_guard_my_list_client_time()
  from public, anon, authenticated;

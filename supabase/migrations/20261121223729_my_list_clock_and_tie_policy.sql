-- Use server time for any client timestamp that is ahead, and align the value
-- to millisecond precision used by Android. On exact timestamp ties, removals
-- win so an old offline add cannot resurrect a tombstoned title.

create or replace function public.vibeflix_guard_my_list_client_time()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.client_updated_at > date_trunc('milliseconds', statement_timestamp()) then
    new.client_updated_at := date_trunc('milliseconds', statement_timestamp());
  end if;

  if tg_op = 'UPDATE' and (
    new.client_updated_at < old.client_updated_at
    or (
      new.client_updated_at = old.client_updated_at
      and (new.is_present or not old.is_present)
    )
  ) then
    return null;
  end if;

  return new;
end;
$$;

revoke all on function public.vibeflix_guard_my_list_client_time()
  from public, anon, authenticated;

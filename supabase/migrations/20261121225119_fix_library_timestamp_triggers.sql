-- Match stamp triggers to the actual columns on My List and watch_progress.
create or replace function public.vibeflix_stamp_my_list_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.added_at := statement_timestamp();
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function public.vibeflix_stamp_watch_progress_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

revoke all on function public.vibeflix_stamp_my_list_timestamps()
  from public, anon, authenticated;
revoke all on function public.vibeflix_stamp_watch_progress_timestamps()
  from public, anon, authenticated;

drop trigger if exists my_list_stamp_timestamps on public.my_list;
create trigger my_list_stamp_timestamps
  before insert or update on public.my_list
  for each row execute function public.vibeflix_stamp_my_list_timestamps();

drop trigger if exists watch_progress_stamp_timestamps on public.watch_progress;
create trigger watch_progress_stamp_timestamps
  before insert or update on public.watch_progress
  for each row execute function public.vibeflix_stamp_watch_progress_timestamps();

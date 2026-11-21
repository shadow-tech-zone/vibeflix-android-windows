-- Hobby/personal-use disclaimer: Vibeflix is a personal hobby project for personal use, not a commercial product, and is not affiliated with Netflix or any content provider. Provided as-is, without warranties.
-- Initial user-scoped library schema. Do not place provider tokens, stream URLs, or secrets in these tables.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'windows')),
  device_name text not null check (char_length(btrim(device_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.titles (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  source text not null check (source in ('Server 1', 'Server 2')),
  title text not null check (char_length(btrim(title)) between 1 and 250),
  poster_url text check (poster_url is null or poster_url ~ '^https://'),
  metadata jsonb not null default '{}'::jsonb check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

create table public.watch_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  episode_key text not null default '' check (char_length(episode_key) <= 128),
  device_id uuid,
  position_ms bigint not null default 0 check (position_ms >= 0),
  duration_ms bigint check (duration_ms is null or duration_ms >= 0),
  completed boolean not null default false,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id, episode_key),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade,
  check (duration_ms is null or position_ms <= duration_ms)
);

create table public.my_list (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  is_present boolean not null default true,
  client_updated_at timestamptz not null,
  added_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade
);

create table public.watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  device_id uuid,
  event_type text not null check (event_type in ('started', 'completed')),
  client_event_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade
);

create index devices_user_last_seen_idx
  on public.devices (user_id, last_seen_at desc);
create index watch_progress_user_updated_idx
  on public.watch_progress (user_id, updated_at desc);
create index my_list_user_updated_idx
  on public.my_list (user_id, updated_at desc)
  where is_present;
create index watch_events_user_created_idx
  on public.watch_events (user_id, created_at desc);

create or replace function public.vibeflix_stamp_timestamps()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
  end if;
  new.updated_at := statement_timestamp();
  return new;
end;
$$;

create or replace function public.vibeflix_stamp_device()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if tg_op = 'INSERT' then
    new.created_at := statement_timestamp();
  end if;
  new.last_seen_at := statement_timestamp();
  return new;
end;
$$;

create or replace function public.vibeflix_stamp_event()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  new.created_at := statement_timestamp();
  return new;
end;
$$;

create trigger profiles_stamp_timestamps
  before insert or update on public.profiles
  for each row execute function public.vibeflix_stamp_timestamps();
create trigger titles_stamp_timestamps
  before insert or update on public.titles
  for each row execute function public.vibeflix_stamp_timestamps();
create trigger watch_progress_stamp_timestamps
  before insert or update on public.watch_progress
  for each row execute function public.vibeflix_stamp_timestamps();
create trigger my_list_stamp_timestamps
  before insert or update on public.my_list
  for each row execute function public.vibeflix_stamp_timestamps();
create trigger devices_stamp_timestamps
  before insert or update on public.devices
  for each row execute function public.vibeflix_stamp_device();
create trigger watch_events_stamp_created_at
  before insert on public.watch_events
  for each row execute function public.vibeflix_stamp_event();

alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.titles enable row level security;
alter table public.watch_progress enable row level security;
alter table public.my_list enable row level security;
alter table public.watch_events enable row level security;

revoke all on table
  public.profiles,
  public.devices,
  public.titles,
  public.watch_progress,
  public.my_list,
  public.watch_events
from anon, authenticated;

-- Profiles expose only the signed-in user's own row; client deletion is not permitted.
grant select on public.profiles to authenticated;
grant insert (id, display_name) on public.profiles to authenticated;
grant update (display_name) on public.profiles to authenticated;

create policy profiles_select_self on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));
create policy profiles_insert_self on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update_self on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- All remaining rows are private to their auth.uid() owner.
grant select, insert, update, delete on public.devices to authenticated;
create policy devices_select_self on public.devices
  for select to authenticated using (user_id = (select auth.uid()));
create policy devices_insert_self on public.devices
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy devices_update_self on public.devices
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy devices_delete_self on public.devices
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.titles to authenticated;
create policy titles_select_self on public.titles
  for select to authenticated using (user_id = (select auth.uid()));
create policy titles_insert_self on public.titles
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy titles_update_self on public.titles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy titles_delete_self on public.titles
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.watch_progress to authenticated;
create policy watch_progress_select_self on public.watch_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy watch_progress_insert_self on public.watch_progress
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watch_progress_update_self on public.watch_progress
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy watch_progress_delete_self on public.watch_progress
  for delete to authenticated using (user_id = (select auth.uid()));

grant select, insert, update on public.my_list to authenticated;
create policy my_list_select_self on public.my_list
  for select to authenticated using (user_id = (select auth.uid()));
create policy my_list_insert_self on public.my_list
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy my_list_update_self on public.my_list
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
-- My List removals are timestamped tombstones; no client DELETE policy is created.

grant select, insert, delete on public.watch_events to authenticated;
create policy watch_events_select_self on public.watch_events
  for select to authenticated using (user_id = (select auth.uid()));
create policy watch_events_insert_self on public.watch_events
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy watch_events_delete_self on public.watch_events
  for delete to authenticated using (user_id = (select auth.uid()));
-- Watch events are append-only from clients; no UPDATE policy or grant is created.

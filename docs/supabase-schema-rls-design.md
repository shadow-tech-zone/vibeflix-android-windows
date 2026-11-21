# Supabase schema and RLS design

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.

**Status: schema and My List timestamp guards applied; Android includes sign-in plus opt-in My List sync; history/progress sync remains unimplemented.** The active Supabase project is `vibeflix-sync` in `ap-southeast-1`. The tracked migrations [`20261121213826_initial_library_schema.sql`](../supabase/migrations/20261121213826_initial_library_schema.sql), [`20261121221815_my_list_sync_guard.sql`](../supabase/migrations/20261121221815_my_list_sync_guard.sql), [`20261121223008_my_list_clock_skew_clamp.sql`](../supabase/migrations/20261121223008_my_list_clock_skew_clamp.sql), and [`20261121223729_my_list_clock_and_tie_policy.sql`](../supabase/migrations/20261121223729_my_list_clock_and_tie_policy.sql) are applied. Android now includes email/password sign-in, Android Keystore-encrypted sessions, and an explicitly enabled, local-first My List merge using source-prefixed hashes of canonical catalog paths and tombstones. The optional GitHub Actions publishable-key variable is not independently verified; live sign-in and My List sync have not been tested. Public email signup is disabled and email confirmation remains required. No watch-history/progress sync, merge RPC, or Windows client is deployed. Auth's site URL remains `http://localhost:3000` with an empty redirect allow-list; configure an Android-safe redirect before adding any callback-based auth flow.

## 1. Goals and boundaries

- Keep Android and Windows clients local-first: signed-out and offline library, history, and resume behavior continue to work. Sync is additive and must not replace the existing Android baseline behavior.
- Sync only the minimum state needed for profiles, devices, title identity/metadata, watch progress/history, and My List.
- Use Supabase Auth with email/password first and email verification enabled. Passkeys/OAuth can be considered later.
- Keep this a personal hobby project for personal use. No commercial claims, warranties, or affiliation with Netflix or content providers.
- Do not store stream/playback URLs, provider credentials, provider tokens, TMDB API tokens, or other secrets. Do not add direct TMDB API integration. Provider-linked poster/backdrop image URLs are allowed as already specified in the handoff.
- Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.
- Keep all rows user-scoped. No anonymous/public access to a user's library or profile.

## 2. Proposed client and trust model (not yet implemented)

1. The intended client signs in using Supabase Auth. Email verification is currently required. Email remains in `auth.users`; do not duplicate it into `profiles`.
2. The Android app stores session tokens in Keystore-backed storage; Windows uses Windows Credential Manager or an equivalent secure store.
3. Client builds may contain only the Supabase anon/publishable key. It is not a secret, but it should be supplied through the approved build configuration. **Never ship or commit the service-role key**: it bypasses RLS.
4. Every user-owned row carries an `auth.users.id` owner (`user_id`, or `id` for `profiles`). RLS is enabled on every exposed table, policies target `authenticated`, and no `anon` policy is added.
5. Keep local data while signed out. My List sync starts only after explicit per-account opt-in; merge local/cloud state non-destructively and do not clear local state on a failed request. Sign-out must not erase the local library. History and progress remain device-only until their sync paths are implemented.
6. Supabase is for account/library sync, not stream resolution or media delivery. No provider tokens, stream URLs, raw provider payload dumps, or credentials are stored in these tables.

## 3. Initial schema tables

The following table sketches describe the applied v1 schema in `public`; the tracked migration contains the exact types, defaults, triggers, indexes, grants, and policies. Table creation does not mean the Android client currently reads or writes cloud data.

### `profiles`

One private profile row per Auth account. Do not expose a public profile directory or copy the email address here.

```sql
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (
    display_name is null or char_length(btrim(display_name)) between 1 and 80
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Owner column: `id`, which must equal `auth.uid()`.
- The client may create/update its own display name only. No client delete policy; account deletion should remove the Auth user and cascade.

### `devices`

One random app-install ID per installation; never use a hardware serial, advertising ID, or fingerprint. Device registration is for sync diagnostics and conflict metadata, not authorization.

```sql
create table public.devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('android', 'windows')),
  device_name text not null check (char_length(btrim(device_name)) between 1 and 80),
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, id)
);
```

- Owner column: `user_id`.
- The displayed device name should be a user-chosen/local label, not a hardware identifier.
- `last_seen_at` should be server-stamped. Whether users can remove/revoke devices needs an approved lifecycle rule.

### `titles`

A per-user catalog reference so one account cannot read or poison another account's title metadata. `id` must be stable across that user's devices and namespaced by source. Prefer a stable catalog/content identifier. If the only available identifier is a canonical detail-page URL, a client-generated SHA-256 key is a fallback only: hashes are not secrets and may be guessable. Never hash or store a playback/stream URL.

```sql
create table public.titles (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null check (char_length(id) between 1 and 128),
  source text not null check (source in ('Server 1', 'Server 2')),
  title text not null check (char_length(btrim(title)) between 1 and 250),
  poster_url text check (poster_url is null or poster_url like 'https://%'),
  metadata jsonb not null default '{}'::jsonb
    check (jsonb_typeof(metadata) = 'object'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
```

- Owner column: `user_id`.
- `Both Servers` is a UI filter, not a `source` value on a title row.
- Store only small, allow-listed display metadata needed to restore the UI; do not mirror arbitrary provider payloads. `poster_url` is an image URL only, not a playback link. No direct TMDB API key or provider secret belongs here.
- `user_id` is part of the primary key so progress, history, and list rows can reference only the same user's title.

### `watch_progress`

One current resume record per user/title/episode. `episode_key = ''` represents a movie; a TV episode uses a stable episode key. A show's Continue Watching item can be derived from its most recently updated, incomplete episode.

```sql
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
```

- Owner column: `user_id`; the composite foreign key prevents cross-user title references.
- `device_id` is optional conflict metadata, not an authorization claim. If retained, a future sync operation should verify that it belongs to the same `user_id`; alternatively omit it from v1.
- `watch_progress.client_updated_at` is reserved for its future merge path; no Android progress writes are enabled. The My List table separately uses `client_updated_at` with the applied monotonic trigger described in Section 5. `updated_at` is server-generated/receipt time and is not trusted from the client.
- Do not upload a row for every player heartbeat. Persist resume points at deliberate intervals and on pause/exit/completion.

### `my_list`

One row per user/title. Removing a title sets `is_present = false` (a tombstone) instead of deleting immediately, so an old offline device cannot accidentally re-add an item during sync.

```sql
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
```

- Owner column: `user_id`; show only rows where `is_present = true`.
- No client `DELETE` policy for this table in v1; add/remove is an owner-only upsert of the `is_present` state. Tombstone retention/compaction must be decided before implementation.

### `watch_events`

Optional, append-oriented history events. Use only events required to rebuild watch history; never send playback heartbeats. A client-generated UUID makes an offline retry idempotent.

```sql
create table public.watch_events (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  device_id uuid,
  event_type text not null check (event_type in ('started', 'completed')),
  client_event_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade
);
```

- Owner column: `user_id`; allow owner `SELECT`, `INSERT`, and (for clear-history controls) `DELETE`, but no `UPDATE`.
- `created_at` is server receipt time. If `client_event_at` is used to preserve offline ordering, validate it as part of the future merge path.
- Retention is undecided. The user must be able to clear history; account deletion cascades. Do not retain more event detail than needed.

## 4. RLS and database privileges

RLS is enabled on all six tables by the applied migration. Authenticated users receive only the operations listed below, with owner checks on each row. Catalog inspection confirmed RLS is enabled and the expected policies and table/column grants are present; this is not yet an adversarial cross-user test suite.

| Table | Owner expression | Allowed client operations |
| --- | --- | --- |
| `profiles` | `id = auth.uid()` | Select, insert, update; no client delete |
| `devices` | `user_id = auth.uid()` | Select, insert, update, delete own rows |
| `titles` | `user_id = auth.uid()` | Select, insert, update, delete own rows |
| `watch_progress` | `user_id = auth.uid()` | Select, insert, update, delete own rows |
| `my_list` | `user_id = auth.uid()` | Select, insert, update own rows; removal uses a tombstone, no client delete |
| `watch_events` | `user_id = auth.uid()` | Select, insert, delete own rows; no update |

Example policy shape (repeat with table-specific owner columns and operations):

```sql
alter table public.profiles enable row level security;

create policy profiles_select_self
  on public.profiles for select to authenticated
  using (id = (select auth.uid()));

create policy profiles_insert_self
  on public.profiles for insert to authenticated
  with check (id = (select auth.uid()));

create policy profiles_update_self
  on public.profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
```

For a `user_id`-owned table, use the same predicate with `user_id` in `USING` and `WITH CHECK`, separately for each permitted operation. For example, update policies need **both** clauses so a user cannot update a row they do not own or transfer their row to another owner. Do not add a permissive `USING (true)` policy or public read policy. `watch_events` gets no update policy; `my_list` gets no delete policy.

RLS is not a substitute for table privileges. Grant only the table/column operations the authenticated clients need; do not grant client access to `anon` or to `auth.users`. Restrict profile writes to the intended profile fields. Avoid `SECURITY DEFINER` functions unless a reviewed requirement makes one unavoidable; any future privileged function must fix `search_path`, derive the owner from `auth.uid()`, and never accept a caller-supplied owner as authority. The service-role key bypasses RLS and must never be placed in a client, repository, issue, log, or release.

## 5. Sync and conflict rules

- Keep local behavior available signed out/offline. Queue mutations locally and retain them until acknowledged.
- Progress is keyed per title/episode. Merge only the same key; derive Continue Watching from the latest incomplete item. Do not let an older queued write replace a newer server record.
- My List uses a timestamped tombstone so removals sync across offline devices. Do not compact tombstones until the app has an approved safe compaction strategy.
- History events are append-only and idempotent by event UUID; avoid high-volume events.
- Applied My List rule: compare per-title state by `client_updated_at`; stale updates are skipped atomically by a `BEFORE INSERT OR UPDATE` trigger. Any client timestamp ahead of server time is clamped to the current server statement time at millisecond precision, preventing a fast device clock from poisoning later writes. On exact timestamp ties, removals win (including in the database trigger), and the Android client makes each local per-title change monotonic by at least one millisecond. Only My List currently uses this guard.
- This trigger does not guard `watch_progress` or `watch_events`; do not enable their cloud writes until equivalent per-record conflict/clock handling and request-level RLS tests are completed. My List still needs live Auth/device verification. RLS remains authoritative and owner IDs are taken from the signed-in session, not treated as authorization merely because the client supplied them.
- Initial local-to-cloud merge must be explicit and non-destructive: combine My List, select the newest valid progress per key, union history by event ID, and preserve the local copy until the server confirms the result.

## 6. RLS/security test plan before treating sync as verified (not yet completed)

The database catalog check is structural verification only. Android My List sync is opt-in and remains unverified; before including it in a release or relying on cross-device data, run request-level isolation tests using separate Auth users and exercise these cases:

1. Unauthenticated/`anon` requests cannot select, insert, update, or delete any user data.
2. User A can access only A's rows. User A sees no User B rows and cannot insert as B, update/delete B's rows, change an owner, or reference B's `titles` row.
3. Repeat isolation tests for every table, not just `profiles`; verify `USING` and `WITH CHECK` behavior on updates/upserts.
4. Confirm there is no `watch_events` update policy and no `my_list` delete policy; owner clear-history and account-delete behavior is intentional.
5. Test stale, future-dated, equal-timestamp, duplicate-event, and offline-retry cases through the approved merge path.
6. Confirm no client build, repository file, workflow log, or release contains a service-role key, provider token, password, or signing secret.

## 7. Decisions and work still needed

The initial schema is in place, but the following decisions or implementation work remain before a production-facing client is enabled:

- [x] Disable public email signup for this personal-use project; email confirmation remains required for email accounts.
- [x] Provision the owner Auth account and confirm it is email-confirmed. Live Android email/password sign-in still needs verification.
- [x] For Android My List, use `s1-`/`s2-` plus SHA-256 of the canonical catalog path as `title_id`; store only allow-listed catalog path/year metadata (never stream URLs). A stable source content ID can replace the hash later if a reliable one is available.
- [ ] Confirm per-episode progress and the `episode_key = ''` convention for movies suit the Android state model.
- [x] Keep My List tombstones indefinitely in v1; no automatic compaction is implemented.
- [ ] Decide whether `watch_events` is required for v1, its retention, and clear-history behavior.
- [x] Choose a pragmatic My List conflict baseline: monotonic last-write-wins, exact ties favor a removal, and any future client timestamp is clamped to millisecond server time. This is enforced by the applied trigger migrations; equivalent guards for watch progress are still pending.
- [ ] Define account deletion/export expectations and device revocation behavior.
- [ ] Add request-level RLS isolation tests with separate users before relying on cross-device sync.
- [x] Add sign-in-only Auth UI/API plumbing and Android Keystore AES-GCM session storage; the publishable-key Actions variable is unverified and live sign-in remains untested.
- [ ] Verify Android email/password sign-in on a device. The owner account is provisioned and confirmed; public signup remains disabled.
- [x] Implement opt-in, local-first Android My List sync with durable tombstones; live Auth/device verification and automated end-to-end tests remain.
- [ ] Extend sync to watch history, Continue Watching/resume, hidden state, and add timestamp guards for watch progress before enabling those writes.

The Supabase project and initial schema are deployed. Android now has sign-in groundwork and an explicitly enabled My List sync path; no cloud history/progress sync or Windows client is deployed. No service-role credential is present in the repository. CI compilation/tests cannot establish live sign-in, REST/RLS isolation, real-device behavior, or playback.

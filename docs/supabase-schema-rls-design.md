# Supabase schema and RLS design

> **Hobby/personal-use disclaimer:** Vibeflix is a personal hobby project for personal use. It is not a commercial product and is not affiliated with Netflix or any content provider. It is provided as-is, without warranties. Use only content and services you are authorized to access. Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.

**Status: Supabase schema and Android source now include opted-in, local-first sync for My List, latest History per title, episode resume/progress, Continue Watching hidden state, and removal/Clear all tombstones. Direct live SQL guard checks pass; the refreshed Android source ZIP passed offline unit tests and debug-package verification in [CI run 44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380). The installed Android debug build has since completed a live sign-in, and Supabase queries confirmed cloud library writes, including a resumable progress checkpoint. Cross-device restore and real-token cross-user RLS isolation remain unverified; the second-install restore test was deferred by the user.** The active Supabase project is `vibeflix-sync` in `ap-southeast-1`. The tracked migrations [`20261121213826_initial_library_schema.sql`](../supabase/migrations/20261121213826_initial_library_schema.sql), [`20261121221815_my_list_sync_guard.sql`](../supabase/migrations/20261121221815_my_list_sync_guard.sql), [`20261121223008_my_list_clock_skew_clamp.sql`](../supabase/migrations/20261121223008_my_list_clock_skew_clamp.sql), [`20261121223729_my_list_clock_and_tie_policy.sql`](../supabase/migrations/20261121223729_my_list_clock_and_tie_policy.sql), [`20261121225119_fix_library_timestamp_triggers.sql`](../supabase/migrations/20261121225119_fix_library_timestamp_triggers.sql), [`20261121230935_sync_history_resume_continue_watching.sql`](../supabase/migrations/20261121230935_sync_history_resume_continue_watching.sql), [`20261121232318_allow_playback_tombstones.sql`](../supabase/migrations/20261121232318_allow_playback_tombstones.sql), [`20261121233451_continue_hidden_unhide_tie_policy.sql`](../supabase/migrations/20261121233451_continue_hidden_unhide_tie_policy.sql), and [`20261121234037_continue_hidden_removal_tie_policy.sql`](../supabase/migrations/20261121234037_continue_hidden_removal_tie_policy.sql) are confirmed in Supabase migration history through version `20261121234037`. Earlier direct database checks passed My List insert, stale-write rejection, removal-wins ties, future-clock clamping, and progress timestamp stamping. The latest live SQL checks also passed History/progress tombstones, the clear watermark, removal-wins hidden-state ties, a later-statement unhide after History removal, stale-state rejection, completion ties, and test-fixture cleanup. A simulated `authenticated` database-role session could access its own My List row but not a different claimed identity's; this is not a PostgREST request with real Auth-issued tokens. Android includes email/password sign-in, Android Keystore-encrypted sessions, and one explicit, versioned per-account consent for the library sync categories above. Cloud payloads use allow-listed canonical catalog metadata and episode keys only; stream/playback URLs and provider credentials are excluded. Public email signup is disabled, phone auth is disabled, and email confirmation remains required. The user-installed Android debug build successfully signed in and wrote library state; Supabase queries also confirmed a resumable checkpoint. This confirms live sign-in and writes only, not restore on a second installation or cross-user isolation. The second-install test is deferred by the user's choice. Request-level RLS isolation with separate real Auth-issued users remains outstanding. Auth's site URL remains `http://localhost:3000` with an empty redirect allow-list; configure an Android-safe redirect before adding any callback-based Auth flow. Only the Android mobile client is retained in this repository.

## 1. Goals and boundaries

- Keep the Android client local-first: signed-out and offline library, history, and resume behavior continue to work. Sync is additive and must not replace the existing Android baseline behavior.
- Sync only the minimum state needed for profiles, devices, title identity/metadata, watch progress/history, and My List.
- Use Supabase Auth with email/password first and email verification enabled. Passkeys/OAuth can be considered later.
- Keep this a personal hobby project for personal use. No commercial claims, warranties, or affiliation with Netflix or content providers.
- Do not store stream/playback URLs, provider credentials, provider tokens, TMDB API tokens, or other secrets. Do not add direct TMDB API integration. Provider-linked poster/backdrop image URLs are allowed as already specified in the handoff.
- Use original artwork, icons, and open fonts; do not use Netflix branding or proprietary assets.
- Keep all rows user-scoped. No anonymous/public access to a user's library or profile.

## 2. Client and trust model

1. The intended client signs in using Supabase Auth. Email verification is currently required. Email remains in `auth.users`; do not duplicate it into `profiles`.
2. The Android app stores session tokens in Keystore-backed storage.
3. Client builds may contain only the Supabase anon/publishable key. It is not a secret, but it should be supplied through the approved build configuration. **Never ship or commit the service-role key**: it bypasses RLS.
4. Every user-owned row carries an `auth.users.id` owner (`user_id`, or `id` for `profiles`). RLS is enabled on every exposed table, policies target `authenticated`, and no `anon` policy is added.
5. Keep local data while signed out. The user must explicitly opt in per account before any My List, History, progress, or Continue Watching state is uploaded. The account UI can revoke consent to stop future sync; revocation and sign-out retain local data and do not delete already-synced cloud rows. Merge local/cloud state non-destructively and retain local data on a failed request. Clear/removal operations use durable tombstones and an account-wide History-clear watermark.
6. Supabase is for account/library sync, not stream resolution or media delivery. No provider tokens, stream URLs, raw provider payload dumps, or credentials are stored in these tables.

## 3. Initial schema tables

The following table sketches describe the applied v1 schema in `public`; the tracked migrations contain the exact types, defaults, triggers, indexes, grants, and policies. Android reads or writes library rows only after explicit per-account consent.

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
  is_present boolean not null default true,
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
- `watch_progress` is keyed per title/episode; `episode_key = ''` represents a movie, and validated TV keys contain season/episode numbers only (for example, `s2e4`). `is_present = false` is a durable removal tombstone. `client_updated_at` is millisecond-precision client ordering, clamped by the server if future-dated; `updated_at` is server-generated/receipt time and is not trusted from the client.
- Do not upload a row for every player heartbeat. Persist resume points at deliberate intervals and on pause/exit/completion.

### `watch_history`, `continue_hidden`, and `user_library_state`

History stores only the latest open/removal state per user/title. Continue Watching visibility has one timestamped row per title. The per-user clear watermark makes Clear all history durable even when an offline device later presents stale rows. History and progress tombstones are never directly deleted by clients.

```sql
create table public.watch_history (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  is_present boolean not null default true,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade
);

create table public.continue_hidden (
  user_id uuid not null references auth.users(id) on delete cascade,
  title_id text not null,
  is_hidden boolean not null,
  client_updated_at timestamptz not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, title_id),
  foreign key (user_id, title_id)
    references public.titles(user_id, id) on delete cascade
);

create table public.user_library_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  history_cleared_at timestamptz not null,
  updated_at timestamptz not null default now()
);
```

- Each table is RLS-protected and owner-scoped. Clients have select/insert/update only; clear/removal is represented by state/tombstone writes, not row deletion.
- History removal also tombstones each known progress key. Clear all stores the watermark and marks pre-clear History/progress removed and Continue Watching entries visible again. Database guards reject stale active rows while accepting their removal tombstones.
- The client syncs the server-confirmed (millisecond-clamped) clear watermark back into local state so a future device clock cannot keep poisoning subsequent merges.

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

RLS is enabled on all nine user-scoped tables by the applied migrations. Authenticated users receive only the operations listed below, with owner checks on each row. Catalog inspection and simulated-role checks are not an adversarial PostgREST/Auth-token test suite.

| Table | Owner expression | Allowed client operations |
| --- | --- | --- |
| `profiles` | `id = auth.uid()` | Select, insert, update; no client delete |
| `devices` | `user_id = auth.uid()` | Select, insert, update, delete own rows |
| `titles` | `user_id = auth.uid()` | Select, insert, update, delete own rows |
| `watch_progress` | `user_id = auth.uid()` | Select, insert, update own rows; removal uses a tombstone, no client delete |
| `watch_history` | `user_id = auth.uid()` | Select, insert, update own rows; removal uses a tombstone, no client delete |
| `continue_hidden` | `user_id = auth.uid()` | Select, insert, update own rows; no client delete |
| `user_library_state` | `user_id = auth.uid()` | Select, insert, update own rows; no client delete |
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

- Keep local behavior available signed out/offline. The user must explicitly enable sync per account; retain local mutations and data if any request fails.
- Desired UX after that one-time consent: automatically start an initial merge on sign-in, then sync queued/coalesced local changes on app resume, network recovery, and suitable background opportunities, with durable retries. Do not require a recurring manual “Sync now” action; expose status quietly and keep a retry action only for recovery. The current Android UI still requires “Sync library now”; this automation is not implemented yet.
- The Android REST client reads in stable primary-key-ordered pages of 100 rows and chunks writes into 100-row batches so long-lived tombstones are not silently clipped by PostgREST row limits.
- My List and latest-per-title History use `client_updated_at` with source-scoped title IDs and durable removal tombstones. History removal tombstones related progress; Clear all history also writes the account-wide `user_library_state.history_cleared_at` watermark so a stale offline device cannot restore rows the clearing device did not know about.
- Progress is keyed per title/episode. Movies use `episode_key = ''`; TV keys are validated season/episode numbers only. Merge only identical keys, never send playback URLs, and derive Continue Watching from the latest incomplete local checkpoint.
- Continue Watching visibility is a timestamped per-title state. Hiding/unhiding merges across devices; clearing/removing History records the visible state and server guards reject stale hidden state for removed/cleared titles.
- Applied server rule across My List, History, progress, hidden state, and the clear watermark: any client timestamp ahead of server time is clamped to millisecond-precision `statement_timestamp()`. Stale writes are skipped atomically. Equal-time removals win History/progress and Continue Watching conflicts; hiding/removing from the shelf wins its tie, while unhide needs a later timestamp. Completed progress wins a non-removal tie. Android increments local per-record timestamps monotonically and reconciles accepted server-clamped timestamps back to local preferences.
- Local-to-cloud merge is explicit and non-destructive. RLS remains authoritative; owner IDs come from the signed-in session, and a client-supplied owner is never treated as authorization. Live sign-in and cloud writes were confirmed on one installed Android build; real-token cross-user isolation and cross-install restore remain outstanding.
- `watch_events` is retained in the schema but is not used by this client; the Android History model stores the latest row per title rather than an event stream.

## 6. RLS/security test plan before treating sync as verified (not yet completed)

The database catalog/grant audit, live direct-SQL trigger checks, and simulated authenticated-role check are not end-to-end API integration tests. Android sign-in and cloud writes were confirmed on the user's installed debug build, but second-install restore and real-token cross-user isolation remain unverified. The user deferred the second-install test; this does not count as a pass. Before claiming cross-device sync is verified, relying on cross-user isolation, or publishing a release that promotes sync, run request-level isolation tests using separate Auth users and exercise these cases:

1. Unauthenticated/`anon` requests cannot select, insert, update, or delete any user data.
2. User A can access only A's rows. User A sees no User B rows and cannot insert as B, update/delete B's rows, change an owner, or reference B's `titles` row.
3. Repeat isolation tests for every table, not just `profiles`; verify `USING` and `WITH CHECK` behavior on updates/upserts.
4. Confirm there is no `watch_events` update policy and no direct delete policy/grant on My List, History, progress, hidden, or library-state rows; account deletion cascades remain intentional.
5. Test stale, future-dated, equal-timestamp, completion/removal, clear-watermark, and offline-retry cases through both the database guards and client merge path.
6. Confirm no client build, repository file, workflow log, or release contains a service-role key, provider token, password, or signing secret.

## 7. Decisions and work still needed

The schema and Android implementation are in place, but live validation remains before sync should be relied on in production:

- [x] Disable public email signup for this personal-use project; email confirmation remains required for email accounts.
- [x] Provision the owner Auth account, confirm it is email-confirmed, and verify Android email/password sign-in on the installed debug build.
- [x] Use `s1-`/`s2-` plus SHA-256 of the canonical catalog path as `title_id`; store only allow-listed catalog path/year metadata. Playback URLs, stream URLs, and provider credentials are excluded.
- [x] Use one latest History row per title; use `episode_key = ''` for movies and validated season/episode keys for TV progress. The user confirmed these cross-device semantics.
- [x] Sync Continue Watching hidden/unhidden state, title removals, and Clear all history using timestamped rows/tombstones plus a clear watermark.
- [x] Keep My List, History, progress, and hidden-state tombstones indefinitely in v1; no automatic compaction is implemented.
- [x] Keep `watch_events` unused for this client; Android History is latest-per-title rather than an append-only event feed.
- [x] Enforce monotonic timestamp conflict guards for My List, History, progress, hidden state, and the clear watermark; future client times are clamped to millisecond server time. Removal wins exact History/progress and hidden-state ties; unhide requires a later timestamp.
- [ ] Define account deletion/export expectations and device revocation behavior.
- [ ] Add request-level RLS isolation tests with separate Auth-issued users before relying on cross-device sync.
- [x] Add sign-in-only Auth UI/API plumbing and Android Keystore AES-GCM session storage.
- [x] Confirm live Android sign-in and cloud writes using the installed debug build; Supabase queries also found a resumable progress checkpoint. Public signup remains disabled.
- [ ] Replace the current manual “Sync library now” path with automatic queued/retried sync after one-time consent, sign-in, local changes, app resume, and network recovery; do not change the local-first/opt-in boundary.
- [ ] Verify restore on a second Android installation. The user deferred this test; it remains unverified, not passed.
- [x] Implement opt-in, local-first Android sync for My List, History, progress/resume, and Continue Watching visibility/tombstones. Direct live-SQL guard checks pass; the refreshed source archive passed offline unit tests and debug-package verification in [CI run 44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380). Live sign-in and cloud writes were subsequently confirmed on the user's installed debug build; second-install restore and request-level isolation remain pending.
- [x] Complete live database guard checks for future-time clamping, clear/removal watermarks, History/progress tombstones, hidden-state removal ties, later unhide after History removal, stale-state rejection, completion ties, and fixture cleanup.
- [x] Run Android CI; latest PR run [44971555380](https://github.com/shadow-tech-zone/vibeflix-android-windows/actions/runs/44971555380) passed offline unit tests, debug-package verification, client-key configuration checks, and private artifact upload.
- [ ] Complete request-level PostgREST/RLS isolation with separate real Auth-issued users and restore validation across separate installations before claiming cross-device sync is verified or promoting sync in a release. The second-install Android restore check is deferred; it remains a required validation before claiming cross-device sync is verified.

The Supabase migrations are deployed. Live Android sign-in and cloud writes have been observed, but database simulation and CI do not establish request-level cross-user RLS isolation, second-install restore, or playback. No service-role credential is present in the repository.

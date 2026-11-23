-- Cross-device History, resume/Continue Watching, and hidden-shelf state.
-- History is one latest-play row per title (matching the Android UI), with tombstones.
-- Playback state is per title/episode; raw playback URLs and provider credentials are never stored.

ALTER TABLE public.watch_progress
  ADD COLUMN IF NOT EXISTS is_present boolean NOT NULL DEFAULT true;

CREATE TABLE public.watch_history (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id text NOT NULL,
  is_present boolean NOT NULL DEFAULT true,
  client_updated_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id, title_id)
    REFERENCES public.titles(user_id, id) ON DELETE CASCADE
);

CREATE TABLE public.continue_hidden (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title_id text NOT NULL,
  is_hidden boolean NOT NULL,
  client_updated_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id, title_id)
    REFERENCES public.titles(user_id, id) ON DELETE CASCADE
);

-- One per-account clear watermark prevents a stale offline device from restoring
-- history or progress after Clear all history has synced.
CREATE TABLE public.user_library_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  history_cleared_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX watch_history_user_updated_idx
  ON public.watch_history (user_id, client_updated_at DESC)
  WHERE is_present;
CREATE INDEX continue_hidden_user_updated_idx
  ON public.continue_hidden (user_id, client_updated_at DESC)
  WHERE is_hidden;

ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.continue_hidden ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_library_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.watch_history, public.continue_hidden, public.user_library_state
  FROM anon, authenticated;

GRANT SELECT, INSERT, UPDATE ON public.watch_history TO authenticated;
CREATE POLICY watch_history_select_self ON public.watch_history
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY watch_history_insert_self ON public.watch_history
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY watch_history_update_self ON public.watch_history
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));
-- History removals are timestamped tombstones; clients cannot DELETE them.

GRANT SELECT, INSERT, UPDATE ON public.continue_hidden TO authenticated;
CREATE POLICY continue_hidden_select_self ON public.continue_hidden
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY continue_hidden_insert_self ON public.continue_hidden
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY continue_hidden_update_self ON public.continue_hidden
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

GRANT SELECT, INSERT, UPDATE ON public.user_library_state TO authenticated;
CREATE POLICY user_library_state_select_self ON public.user_library_state
  FOR SELECT TO authenticated USING (user_id = (SELECT auth.uid()));
CREATE POLICY user_library_state_insert_self ON public.user_library_state
  FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
CREATE POLICY user_library_state_update_self ON public.user_library_state
  FOR UPDATE TO authenticated
  USING (user_id = (SELECT auth.uid()))
  WITH CHECK (user_id = (SELECT auth.uid()));

-- Progress deletion must be represented by an is_present=false tombstone.
REVOKE DELETE ON TABLE public.watch_progress FROM authenticated;
DROP POLICY IF EXISTS watch_progress_delete_self ON public.watch_progress;

CREATE OR REPLACE FUNCTION public.vibeflix_stamp_library_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  NEW.updated_at := statement_timestamp();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vibeflix_guard_watch_history()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cleared_at timestamptz;
BEGIN
  IF NEW.client_updated_at > date_trunc('milliseconds', statement_timestamp()) THEN
    NEW.client_updated_at := date_trunc('milliseconds', statement_timestamp());
  END IF;

  SELECT history_cleared_at INTO v_cleared_at
    FROM public.user_library_state WHERE user_id = NEW.user_id;
  IF NEW.is_present AND v_cleared_at IS NOT NULL
     AND NEW.client_updated_at <= v_cleared_at THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' AND (
    NEW.client_updated_at < OLD.client_updated_at
    OR (
      NEW.client_updated_at = OLD.client_updated_at
      AND (NEW.is_present OR NOT OLD.is_present)
    )
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vibeflix_guard_watch_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cleared_at timestamptz;
  v_history_present boolean;
  v_history_time timestamptz;
BEGIN
  IF NEW.client_updated_at > date_trunc('milliseconds', statement_timestamp()) THEN
    NEW.client_updated_at := date_trunc('milliseconds', statement_timestamp());
  END IF;

  SELECT history_cleared_at INTO v_cleared_at
    FROM public.user_library_state WHERE user_id = NEW.user_id;
  IF v_cleared_at IS NOT NULL AND NEW.client_updated_at <= v_cleared_at THEN
    RETURN NULL;
  END IF;

  SELECT is_present, client_updated_at INTO v_history_present, v_history_time
    FROM public.watch_history
    WHERE user_id = NEW.user_id AND title_id = NEW.title_id;
  IF FOUND AND NOT v_history_present AND NEW.client_updated_at <= v_history_time THEN
    RETURN NULL;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF NEW.client_updated_at < OLD.client_updated_at THEN
      RETURN NULL;
    END IF;
    IF NEW.client_updated_at = OLD.client_updated_at THEN
      IF NEW.is_present <> OLD.is_present THEN
        IF NEW.is_present THEN RETURN NULL; END IF;
      ELSIF NEW.completed <> OLD.completed THEN
        IF NOT NEW.completed THEN RETURN NULL; END IF;
      ELSIF NEW.position_ms <= OLD.position_ms THEN
        RETURN NULL;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vibeflix_guard_continue_hidden()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.client_updated_at > date_trunc('milliseconds', statement_timestamp()) THEN
    NEW.client_updated_at := date_trunc('milliseconds', statement_timestamp());
  END IF;
  IF TG_OP = 'UPDATE' AND (
    NEW.client_updated_at < OLD.client_updated_at
    OR (
      NEW.client_updated_at = OLD.client_updated_at
      AND (NEW.is_hidden IS NOT DISTINCT FROM OLD.is_hidden OR NOT NEW.is_hidden)
    )
  ) THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.vibeflix_guard_user_library_state()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.history_cleared_at > date_trunc('milliseconds', statement_timestamp()) THEN
    NEW.history_cleared_at := date_trunc('milliseconds', statement_timestamp());
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.history_cleared_at <= OLD.history_cleared_at THEN
    RETURN NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.vibeflix_stamp_library_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vibeflix_guard_watch_history() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vibeflix_guard_watch_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vibeflix_guard_continue_hidden() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vibeflix_guard_user_library_state() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS watch_history_guard_timestamps ON public.watch_history;
CREATE TRIGGER watch_history_guard_timestamps
  BEFORE INSERT OR UPDATE ON public.watch_history
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_guard_watch_history();
CREATE TRIGGER watch_history_stamp_updated_at
  BEFORE INSERT OR UPDATE ON public.watch_history
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_stamp_library_updated_at();

DROP TRIGGER IF EXISTS watch_progress_guard_timestamps ON public.watch_progress;
CREATE TRIGGER watch_progress_guard_timestamps
  BEFORE INSERT OR UPDATE ON public.watch_progress
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_guard_watch_progress();

CREATE TRIGGER continue_hidden_guard_timestamps
  BEFORE INSERT OR UPDATE ON public.continue_hidden
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_guard_continue_hidden();
CREATE TRIGGER continue_hidden_stamp_updated_at
  BEFORE INSERT OR UPDATE ON public.continue_hidden
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_stamp_library_updated_at();

CREATE TRIGGER user_library_state_guard_timestamps
  BEFORE INSERT OR UPDATE ON public.user_library_state
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_guard_user_library_state();
CREATE TRIGGER user_library_state_stamp_updated_at
  BEFORE INSERT OR UPDATE ON public.user_library_state
  FOR EACH ROW EXECUTE FUNCTION public.vibeflix_stamp_library_updated_at();

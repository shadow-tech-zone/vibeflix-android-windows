-- Deletion tombstones for progress/Continue Watching must survive history removals
-- and a global history clear. Stale active state remains rejected after either event.

CREATE OR REPLACE FUNCTION public.vibeflix_guard_watch_progress()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_cleared_at timestamptz;
  v_history_present boolean;
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

  SELECT is_present INTO v_history_present
    FROM public.watch_history
    WHERE user_id = NEW.user_id AND title_id = NEW.title_id;
  IF FOUND AND NOT v_history_present AND NEW.is_present THEN
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
DECLARE
  v_cleared_at timestamptz;
  v_history_present boolean;
BEGIN
  IF NEW.client_updated_at > date_trunc('milliseconds', statement_timestamp()) THEN
    NEW.client_updated_at := date_trunc('milliseconds', statement_timestamp());
  END IF;

  IF NEW.is_hidden THEN
    SELECT history_cleared_at INTO v_cleared_at
      FROM public.user_library_state WHERE user_id = NEW.user_id;
    IF v_cleared_at IS NOT NULL AND NEW.client_updated_at <= v_cleared_at THEN
      RETURN NULL;
    END IF;
    SELECT is_present INTO v_history_present
      FROM public.watch_history
      WHERE user_id = NEW.user_id AND title_id = NEW.title_id;
    IF FOUND AND NOT v_history_present THEN
      RETURN NULL;
    END IF;
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

REVOKE ALL ON FUNCTION public.vibeflix_guard_watch_progress() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.vibeflix_guard_continue_hidden() FROM PUBLIC, anon, authenticated;

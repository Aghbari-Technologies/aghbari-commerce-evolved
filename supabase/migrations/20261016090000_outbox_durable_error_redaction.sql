-- AGH-ASYNC-OUTBOX-001: enforce redaction at the database boundary too.
-- Never rely solely on the Edge worker's sanitizer before persisting durable error details.

CREATE OR REPLACE FUNCTION public.sanitize_outbox_error_message(p_message text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $function$
DECLARE
  v_message text := left(coalesce(p_message, ''), 2000);
BEGIN
  v_message := regexp_replace(
    v_message,
    '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}',
    '[email redacted]',
    'gi'
  );
  v_message := regexp_replace(
    v_message,
    'Bearer[[:space:]]+[^[:space:],;]+',
    'Bearer [redacted]',
    'gi'
  );
  v_message := regexp_replace(
    v_message,
    'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}',
    '[token redacted]',
    'g'
  );
  v_message := regexp_replace(
    v_message,
    '(sk-[A-Za-z0-9_-]{16,}|AIza[A-Za-z0-9_-]{20,})',
    '[secret redacted]',
    'g'
  );
  v_message := regexp_replace(
    v_message,
    '((service_role|anon_key|api[_-]?key|password|secret|access[_-]?token)[=:][[:space:]]*)[^[:space:],;]+',
    E'\\1[redacted]',
    'gi'
  );
  v_message := regexp_replace(
    v_message,
    '([?&](access_token|refresh_token|token|api[_-]?key|key|password|secret)=)[^&[:space:]]+',
    E'\\1[redacted]',
    'gi'
  );
  v_message := regexp_replace(
    v_message,
    '[0-9٠-٩۰-۹][0-9٠-٩۰-۹[:space:]().-]{6,}[0-9٠-٩۰-۹]',
    '[number redacted]',
    'g'
  );
  v_message := regexp_replace(v_message, '[[:cntrl:]]', ' ', 'g');
  v_message := regexp_replace(v_message, '[[:space:]]+', ' ', 'g');
  RETURN left(coalesce(nullif(btrim(v_message), ''), 'No error detail supplied'), 500);
END;
$function$;

REVOKE ALL ON FUNCTION public.sanitize_outbox_error_message(text) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fail_outbox_event(
  p_event_id uuid,
  p_worker text,
  p_error_class text,
  p_error_message text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_event public.outbox_events%ROWTYPE;
  v_class text;
  v_message text;
  v_status text;
  v_delay_seconds integer;
BEGIN
  IF p_event_id IS NULL OR coalesce(length(btrim(p_worker)),0)<1 OR length(p_worker)>120 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid outbox event or worker';
  END IF;
  IF coalesce(current_setting('request.jwt.claim.role',true),'') <> 'service_role'
     AND session_user NOT IN ('postgres','supabase_admin') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='outbox failure reporting requires a trusted worker';
  END IF;

  SELECT e.* INTO v_event
    FROM public.outbox_events e
   WHERE e.id=p_event_id
   FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='outbox event not found';
  END IF;
  IF v_event.status IN ('processed','dead_letter') THEN
    RETURN pg_catalog.jsonb_build_object('status',v_event.status,'already_terminal',true,'event_id',v_event.id);
  END IF;
  IF v_event.status<>'processing' OR v_event.locked_by IS DISTINCT FROM p_worker THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='outbox event is not leased to this worker';
  END IF;

  v_class := left(regexp_replace(coalesce(p_error_class,'worker_error'),'[^A-Za-z0-9_.-]','','g'),80);
  IF v_class='' THEN v_class:='worker_error'; END IF;
  v_message := public.sanitize_outbox_error_message(p_error_message);
  IF v_message='' THEN v_message:='No error detail supplied'; END IF;

  IF v_event.attempts >= 8 THEN
    v_status := 'dead_letter';
    v_delay_seconds := 0;
  ELSE
    v_status := 'retry';
    v_delay_seconds := LEAST(3600, 15 * (2 ^ LEAST(GREATEST(v_event.attempts - 1,0),8))::integer);
  END IF;

  UPDATE public.outbox_events e
     SET status=v_status,
         next_attempt_at=CASE WHEN v_status='retry' THEN now()+pg_catalog.make_interval(secs=>v_delay_seconds) ELSE e.next_attempt_at END,
         dead_letter_at=CASE WHEN v_status='dead_letter' THEN coalesce(e.dead_letter_at,now()) ELSE e.dead_letter_at END,
         error_class=v_class,
         last_error=pg_catalog.jsonb_build_object('error_class',v_class,'message',v_message,'attempts',v_event.attempts),
         locked_at=NULL,
         locked_by=NULL
   WHERE e.id=v_event.id;

  RETURN pg_catalog.jsonb_build_object(
    'status',v_status,
    'event_id',v_event.id,
    'attempts',v_event.attempts,
    'delay_seconds',v_delay_seconds,
    'dead_letter_at',CASE WHEN v_status='dead_letter' THEN now() ELSE NULL END
  );
END;
$function$;

COMMENT ON FUNCTION public.sanitize_outbox_error_message(text) IS
  'Bounded database-side redaction for durable Outbox failure messages; internal helper, not a client API.';
COMMENT ON FUNCTION public.fail_outbox_event(uuid,text,text,text) IS
  'Records a bounded, database-sanitized error and schedules exponential retry or dead-letters after eight attempts.';

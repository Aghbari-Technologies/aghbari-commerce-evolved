-- AGH-ASYNC-OUTBOX-001: close the database-side error-header redaction gap.
-- Worker sanitization is defense in depth, not the persistence boundary.

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
  -- Redact whole credential header values line-by-line, independent of auth scheme.
  -- [[:blank:]] excludes newline so these expressions cannot consume adjacent headers.
  v_message := regexp_replace(
    v_message,
    '(authorization|proxy-authorization)[[:blank:]]*:[[:blank:]]*[^[:cntrl:]]*',
    '[authorization redacted]',
    'gi'
  );
  v_message := regexp_replace(
    v_message,
    '(cookie|set-cookie)[[:blank:]]*:[[:blank:]]*[^[:cntrl:]]*',
    '[cookie redacted]',
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
COMMENT ON FUNCTION public.sanitize_outbox_error_message(text) IS
  'Bounded database-side redaction for durable Outbox errors, including authorization and cookie headers; internal helper, not a client API.';

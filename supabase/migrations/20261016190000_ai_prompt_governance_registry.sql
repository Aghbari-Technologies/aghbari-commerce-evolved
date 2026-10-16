-- Versioned, tenant-scoped prompt governance. Approval does not activate a model runtime.
CREATE TABLE IF NOT EXISTS public.ai_prompt_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_key text NOT NULL CHECK (prompt_key ~ '^[a-z][a-z0-9._-]{2,79}$'),
  display_name text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 2 AND 160),
  description text CHECK (description IS NULL OR length(description) <= 600),
  prompt_body text NOT NULL CHECK (length(btrim(prompt_body)) BETWEEN 20 AND 12000),
  version integer NOT NULL CHECK (version > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','pending_review','approved','rejected')),
  created_by uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  submitted_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  submitted_at timestamptz,
  reviewed_by uuid REFERENCES public.profiles(id) ON DELETE RESTRICT,
  reviewed_at timestamptz,
  review_note text CHECK (review_note IS NULL OR length(review_note) <= 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, prompt_key, version),
  CHECK (
    (status='draft' AND submitted_at IS NULL AND submitted_by IS NULL AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status='pending_review' AND submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND reviewed_at IS NULL AND reviewed_by IS NULL)
    OR (status='approved' AND submitted_at IS NOT NULL AND submitted_by IS NOT NULL AND reviewed_at IS NOT NULL AND reviewed_by IS NOT NULL)
    OR (status='rejected' AND (submitted_at IS NULL OR submitted_by IS NOT NULL))
  )
);

CREATE INDEX IF NOT EXISTS ai_prompt_templates_tenant_status_updated_idx
  ON public.ai_prompt_templates (organization_id, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS ai_prompt_templates_tenant_key_version_idx
  ON public.ai_prompt_templates (organization_id, prompt_key, version DESC);

CREATE TABLE IF NOT EXISTS public.ai_prompt_audit_log (
  event_sequence bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  prompt_template_id uuid NOT NULL REFERENCES public.ai_prompt_templates(id) ON DELETE RESTRICT,
  actor_profile_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('draft_created','draft_updated','submitted_for_review','approved','rejected')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(metadata)='object'),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ai_prompt_audit_tenant_created_idx
  ON public.ai_prompt_audit_log (organization_id, event_sequence DESC);

ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_prompt_templates_staff_select ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_staff_select ON public.ai_prompt_templates
  FOR SELECT TO authenticated USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles AS p
      JOIN public.user_roles AS ur ON ur.profile_id=p.id
      WHERE p.auth_user_id=auth.uid() AND p.is_active
        AND ur.role IN ('admin','manager','staff')
      LIMIT 1
    )
  );

DROP POLICY IF EXISTS ai_prompt_audit_staff_select ON public.ai_prompt_audit_log;
CREATE POLICY ai_prompt_audit_staff_select ON public.ai_prompt_audit_log
  FOR SELECT TO authenticated USING (
    organization_id = (
      SELECT p.organization_id
      FROM public.profiles AS p
      JOIN public.user_roles AS ur ON ur.profile_id=p.id
      WHERE p.auth_user_id=auth.uid() AND p.is_active
        AND ur.role IN ('admin','manager','staff')
      LIMIT 1
    )
  );

REVOKE ALL ON TABLE public.ai_prompt_templates, public.ai_prompt_audit_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.ai_prompt_templates, public.ai_prompt_audit_log TO authenticated;

CREATE OR REPLACE FUNCTION public.create_ai_prompt_draft(
  p_prompt_key text,p_display_name text,p_description text,p_prompt_body text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_org uuid;
  v_key text := lower(btrim(coalesce(p_prompt_key,'')));
  v_name text := btrim(coalesce(p_display_name,''));
  v_version integer;
  v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active staff session required';
  END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles AS p
   WHERE p.id=v_actor AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS ur WHERE ur.profile_id=v_actor AND ur.role IN ('admin','manager','staff')
  ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff role required to create prompt drafts'; END IF;
  IF v_key !~ '^[a-z][a-z0-9._-]{2,79}$' OR length(v_name) NOT BETWEEN 2 AND 160
     OR (p_description IS NOT NULL AND length(p_description)>600)
     OR length(btrim(coalesce(p_prompt_body,''))) NOT BETWEEN 20 AND 12000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='prompt draft fields are outside their allowed format or length';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_org::text || ':' || v_key,0));
  SELECT coalesce(max(t.version),0)+1 INTO v_version
    FROM public.ai_prompt_templates AS t WHERE t.organization_id=v_org AND t.prompt_key=v_key;
  INSERT INTO public.ai_prompt_templates(organization_id,prompt_key,display_name,description,prompt_body,version,status,created_by)
    VALUES(v_org,v_key,v_name,nullif(btrim(coalesce(p_description,'')),''),btrim(p_prompt_body),v_version,'draft',v_actor)
    RETURNING id INTO v_id;
  INSERT INTO public.ai_prompt_audit_log(organization_id,prompt_template_id,actor_profile_id,action,metadata)
    VALUES(v_org,v_id,v_actor,'draft_created',jsonb_build_object('prompt_key',v_key,'version',v_version));
  RETURN v_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.update_ai_prompt_draft(
  p_id uuid,p_display_name text,p_description text,p_prompt_body text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_org uuid;
  v_prompt public.ai_prompt_templates%ROWTYPE;
  v_name text := btrim(coalesce(p_display_name,''));
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active staff session required'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles AS p
   WHERE p.id=v_actor AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS ur WHERE ur.profile_id=v_actor AND ur.role IN ('admin','manager','staff')
  ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff role required to edit prompt drafts'; END IF;
  IF length(v_name) NOT BETWEEN 2 AND 160 OR (p_description IS NOT NULL AND length(p_description)>600)
     OR length(btrim(coalesce(p_prompt_body,''))) NOT BETWEEN 20 AND 12000 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='prompt draft fields are outside their allowed length';
  END IF;
  SELECT * INTO v_prompt FROM public.ai_prompt_templates AS t WHERE t.id=p_id AND t.organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='prompt draft not found in this organization'; END IF;
  IF v_prompt.created_by IS DISTINCT FROM v_actor OR v_prompt.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='only the original author can edit an unsubmitted or rejected prompt draft';
  END IF;
  UPDATE public.ai_prompt_templates AS t SET display_name=v_name,
    description=nullif(btrim(coalesce(p_description,'')),''),
    prompt_body=btrim(p_prompt_body),status='draft',submitted_by=NULL,submitted_at=NULL,
    reviewed_by=NULL,reviewed_at=NULL,review_note=NULL,updated_at=now()
  WHERE t.id=p_id AND t.organization_id=v_org;
  INSERT INTO public.ai_prompt_audit_log(organization_id,prompt_template_id,actor_profile_id,action,metadata)
    VALUES(v_org,p_id,v_actor,'draft_updated',jsonb_build_object('prompt_key',v_prompt.prompt_key,'version',v_prompt.version));
  RETURN p_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.submit_ai_prompt_for_review(p_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_org uuid;
  v_prompt public.ai_prompt_templates%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active staff session required'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles AS p
   WHERE p.id=v_actor AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS ur WHERE ur.profile_id=v_actor AND ur.role IN ('admin','manager','staff')
  ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff role required to submit prompt drafts'; END IF;
  SELECT * INTO v_prompt FROM public.ai_prompt_templates AS t WHERE t.id=p_id AND t.organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='prompt draft not found in this organization'; END IF;
  IF v_prompt.created_by IS DISTINCT FROM v_actor OR v_prompt.status NOT IN ('draft','rejected') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='only the original author can submit this prompt draft';
  END IF;
  UPDATE public.ai_prompt_templates AS t
    SET status='pending_review',submitted_by=v_actor,submitted_at=now(),reviewed_by=NULL,reviewed_at=NULL,review_note=NULL,updated_at=now()
    WHERE t.id=p_id AND t.organization_id=v_org;
  INSERT INTO public.ai_prompt_audit_log(organization_id,prompt_template_id,actor_profile_id,action,metadata)
    VALUES(v_org,p_id,v_actor,'submitted_for_review',jsonb_build_object('prompt_key',v_prompt.prompt_key,'version',v_prompt.version));
  RETURN p_id;
END;
$fn$;

CREATE OR REPLACE FUNCTION public.review_ai_prompt(p_id uuid,p_decision text,p_note text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_actor uuid := public.current_profile_id();
  v_org uuid;
  v_prompt public.ai_prompt_templates%ROWTYPE;
  v_action text;
BEGIN
  IF auth.uid() IS NULL OR v_actor IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active reviewer session required'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles AS p
   WHERE p.id=v_actor AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles AS ur WHERE ur.profile_id=v_actor AND ur.role IN ('admin','manager')
  ) THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='admin or manager role required to review prompt drafts'; END IF;
  IF p_decision NOT IN ('approve','reject') OR length(coalesce(p_note,''))>500 THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='review decision or note is invalid';
  END IF;
  SELECT * INTO v_prompt FROM public.ai_prompt_templates AS t WHERE t.id=p_id AND t.organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='prompt not found in this organization'; END IF;
  IF v_prompt.status <> 'pending_review' THEN RAISE EXCEPTION USING ERRCODE='55000', MESSAGE='only submitted prompts can be reviewed'; END IF;
  IF v_prompt.created_by=v_actor OR v_prompt.submitted_by=v_actor THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='maker-checker rule forbids approving your own prompt submission';
  END IF;
  v_action := CASE WHEN p_decision='approve' THEN 'approved' ELSE 'rejected' END;
  UPDATE public.ai_prompt_templates AS t SET status=v_action,reviewed_by=v_actor,reviewed_at=now(),
    review_note=nullif(btrim(coalesce(p_note,'')),''),updated_at=now()
    WHERE t.id=p_id AND t.organization_id=v_org;
  INSERT INTO public.ai_prompt_audit_log(organization_id,prompt_template_id,actor_profile_id,action,metadata)
    VALUES(v_org,p_id,v_actor,v_action,jsonb_build_object('prompt_key',v_prompt.prompt_key,'version',v_prompt.version,'note_present',length(coalesce(p_note,''))>0));
  RETURN p_id;
END;
$fn$;

REVOKE ALL ON FUNCTION public.create_ai_prompt_draft(text,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.update_ai_prompt_draft(uuid,text,text,text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_ai_prompt_for_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.review_ai_prompt(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_ai_prompt_draft(text,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_ai_prompt_draft(uuid,text,text,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_ai_prompt_for_review(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.review_ai_prompt(uuid,text,text) TO authenticated;

COMMENT ON TABLE public.ai_prompt_templates IS 'Tenant-owned, versioned prompt governance. Approval does not auto-activate any runtime.';
COMMENT ON TABLE public.ai_prompt_audit_log IS 'Append-only governance transitions; audit metadata must not contain prompt bodies, credentials, or customer data.';

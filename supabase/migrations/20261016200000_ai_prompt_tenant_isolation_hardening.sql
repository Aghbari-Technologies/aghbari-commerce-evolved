-- Independent tenant boundary: this restrictive policy composes with all permissive SELECT policies.
-- If no active tenant resolves for the authenticated user, the comparison is NULL and no rows are visible.
ALTER TABLE public.ai_prompt_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_prompt_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_prompt_templates_tenant_scope ON public.ai_prompt_templates;
CREATE POLICY ai_prompt_templates_tenant_scope
  ON public.ai_prompt_templates
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

DROP POLICY IF EXISTS ai_prompt_audit_tenant_scope ON public.ai_prompt_audit_log;
CREATE POLICY ai_prompt_audit_tenant_scope
  ON public.ai_prompt_audit_log
  AS RESTRICTIVE
  FOR SELECT TO authenticated
  USING (organization_id = public.current_organization_id());

-- Route invoice financial visibility changes through a tenant-bound, role-checked RPC.
-- Customer invoice amounts remain hidden unless the active organization explicitly opts in.
CREATE OR REPLACE FUNCTION public.set_customer_invoice_amount_visibility(p_visible boolean)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL OR p_visible IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='22023',
      MESSAGE='invoice visibility must be explicitly set by an authenticated active profile';
  END IF;

  SELECT p.organization_id INTO v_org
    FROM public.profiles p
   WHERE p.id = v_profile
     AND p.auth_user_id = auth.uid()
     AND p.is_active
     AND EXISTS (
       SELECT 1 FROM public.user_roles r
        WHERE r.profile_id = p.id
          AND r.role IN ('admin','manager')
     )
   LIMIT 1;

  IF v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',
      MESSAGE='changing customer invoice amount visibility requires admin or manager role';
  END IF;

  INSERT INTO public.admin_settings(organization_id,key,value,category)
  VALUES (v_org,'customer_invoice_amounts_visible',pg_catalog.to_jsonb(p_visible),'privacy')
  ON CONFLICT (organization_id,key) DO UPDATE
    SET value = EXCLUDED.value,
        category = EXCLUDED.category,
        updated_at = pg_catalog.now();

  RETURN pg_catalog.jsonb_build_object(
    'key','customer_invoice_amounts_visible',
    'visible',p_visible
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.set_customer_invoice_amount_visibility(boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_customer_invoice_amount_visibility(boolean) TO authenticated;

COMMENT ON FUNCTION public.set_customer_invoice_amount_visibility(boolean) IS
  'Admin/manager-only tenant-scoped invoice financial display policy. Missing or invalid setting values remain hidden in get_customer_invoice_pdf.';

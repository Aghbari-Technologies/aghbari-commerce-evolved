-- Guard the publication config and every public reader against cross-tenant warehouse bindings.
-- A warehouse ID is not tenant proof: validate its organization independently of the FK.

CREATE OR REPLACE FUNCTION public.guard_storefront_publication_warehouse_scope()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
BEGIN
  IF NEW.warehouse_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.warehouses AS w
    WHERE w.id = NEW.warehouse_id
      AND w.organization_id = NEW.organization_id
  ) THEN
    RAISE EXCEPTION USING
      ERRCODE = '23514',
      MESSAGE = 'Storefront warehouse must belong to the configured organization';
  END IF;

  RETURN NEW;
END
$function$;

REVOKE ALL ON FUNCTION public.guard_storefront_publication_warehouse_scope() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS storefront_publication_warehouse_scope_guard
  ON public.storefront_publication_config;
CREATE TRIGGER storefront_publication_warehouse_scope_guard
  BEFORE INSERT OR UPDATE OF organization_id, warehouse_id
  ON public.storefront_publication_config
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_storefront_publication_warehouse_scope();

-- Never emit a warehouse ID from another tenant, even if an older or privileged
-- writer left invalid configuration behind. Inactive warehouses are not a public stock source.
CREATE OR REPLACE FUNCTION public.public_storefront_warehouse_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT w.id
  FROM public.storefront_publication_config AS c
  JOIN public.organizations AS org
    ON org.id = c.organization_id
   AND org.is_active = true
  JOIN public.warehouses AS w
    ON w.id = c.warehouse_id
   AND w.organization_id = c.organization_id
   AND w.is_active = true
  WHERE c.singleton = true
    AND c.is_enabled = true
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.public_storefront_warehouse_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_storefront_warehouse_id() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_storefront_context()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_organization_id uuid;
  v_warehouse_id uuid;
BEGIN
  SELECT c.organization_id, w.id
    INTO v_organization_id, v_warehouse_id
  FROM public.storefront_publication_config AS c
  JOIN public.organizations AS org
    ON org.id = c.organization_id
   AND org.is_active = true
  LEFT JOIN public.warehouses AS w
    ON w.id = c.warehouse_id
   AND w.organization_id = c.organization_id
   AND w.is_active = true
  WHERE c.singleton = true
    AND c.is_enabled = true
  LIMIT 1;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE = 'P0002', MESSAGE = 'Public storefront tenant is not configured';
  END IF;

  RETURN jsonb_build_object(
    'organization_id', v_organization_id,
    'warehouse_id', v_warehouse_id
  );
END
$function$;

REVOKE ALL ON FUNCTION public.get_public_storefront_context() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_storefront_context() TO anon, authenticated;

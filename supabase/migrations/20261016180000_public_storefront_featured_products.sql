-- Tenant-scoped, editorial storefront curation. Public callers receive IDs and rank only.
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS products_public_featured_org_idx
  ON public.products (organization_id, created_at DESC, name, id)
  WHERE status = 'active' AND is_featured = true;

CREATE OR REPLACE FUNCTION public.fetch_public_featured_products(p_limit integer DEFAULT 20)
RETURNS TABLE(product_id uuid, ranking_position bigint)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $fn$
DECLARE
  v_organization_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    v_organization_id := public.public_storefront_organization_id();
  ELSE
    v_organization_id := public.current_organization_id();
  END IF;

  IF v_organization_id IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY
  WITH featured AS (
    SELECT p.id AS product_id, p.created_at, p.name
    FROM public.products AS p
    WHERE p.organization_id = v_organization_id
      AND p.status = 'active'
      AND p.is_featured = true
  ),
  ranked AS (
    SELECT featured.product_id,
      ROW_NUMBER() OVER (
        ORDER BY featured.created_at DESC, featured.name ASC, featured.product_id ASC
      )::bigint AS ranking_position
    FROM featured
  )
  SELECT ranked.product_id, ranked.ranking_position
  FROM ranked
  ORDER BY ranked.ranking_position
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
END;
$fn$;

REVOKE ALL ON FUNCTION public.fetch_public_featured_products(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_public_featured_products(integer) TO anon, authenticated;

COMMENT ON COLUMN public.products.is_featured IS
  'Tenant-owned editorial flag controlled through the existing staff product-management permissions.';
COMMENT ON FUNCTION public.fetch_public_featured_products(integer) IS
  'Returns ranked IDs of active featured products for the server-derived published storefront or authenticated tenant; never returns product details, prices or sales data.';

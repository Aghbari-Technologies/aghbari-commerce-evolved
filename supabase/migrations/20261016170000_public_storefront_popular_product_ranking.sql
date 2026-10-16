-- Public B2B storefront ranking is computed from eligible order records and returns IDs/ranks only.
-- Tenant identity is always derived server-side; callers cannot supply an organization ID.
CREATE INDEX IF NOT EXISTS orders_storefront_popularity_idx
  ON public.orders (organization_id, status, id);

CREATE INDEX IF NOT EXISTS order_items_storefront_popularity_idx
  ON public.order_items (product_id, order_id)
  WHERE product_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.fetch_public_popular_products(p_limit integer DEFAULT 20)
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
  WITH popularity AS (
    SELECT
      p.id AS product_id,
      p.name AS product_name,
      SUM(GREATEST(COALESCE(oi.approved_quantity, oi.requested_quantity, oi.quantity, 0), 0))::numeric AS total_ordered,
      COUNT(DISTINCT o.id)::bigint AS order_count
    FROM public.products AS p
    JOIN public.order_items AS oi
      ON oi.product_id = p.id
    JOIN public.orders AS o
      ON o.id = oi.order_id
     AND o.organization_id = v_organization_id
    WHERE p.organization_id = v_organization_id
      AND p.status = 'active'
      AND o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
    GROUP BY p.id, p.name
    HAVING SUM(GREATEST(COALESCE(oi.approved_quantity, oi.requested_quantity, oi.quantity, 0), 0)) > 0
  ),
  ranked AS (
    SELECT
      popularity.product_id,
      ROW_NUMBER() OVER (
        ORDER BY popularity.total_ordered DESC,
                 popularity.order_count DESC,
                 popularity.product_name ASC,
                 popularity.product_id ASC
      )::bigint AS ranking_position
    FROM popularity
  )
  SELECT ranked.product_id, ranked.ranking_position
  FROM ranked
  ORDER BY ranked.ranking_position
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 20), 50));
END;
$fn$;

REVOKE ALL ON FUNCTION public.fetch_public_popular_products(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fetch_public_popular_products(integer) TO anon, authenticated;

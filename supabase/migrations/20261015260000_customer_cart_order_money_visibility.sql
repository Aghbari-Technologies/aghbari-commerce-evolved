-- Independent, server-enforced visibility policies for customer cart/checkout and order details.
-- Both policies default to hidden. Client state and CSS are never authorization boundaries.

CREATE OR REPLACE FUNCTION public.set_customer_money_display_policy(p_surface text,p_visible boolean)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_key text;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL OR p_visible IS NULL
     OR p_surface IS NULL OR p_surface NOT IN ('cart','order') THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='surface must be cart or order and visibility must be explicit';
  END IF;

  SELECT p.organization_id INTO v_org
    FROM public.profiles p
   WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active
     AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.profile_id=p.id AND r.role IN ('admin','manager'))
   LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='changing customer money display policies requires admin or manager role';
  END IF;

  v_key := CASE p_surface WHEN 'cart' THEN 'customer_cart_amounts_visible' WHEN 'order' THEN 'customer_order_amounts_visible' END;
  INSERT INTO public.admin_settings(organization_id,key,value,category)
  VALUES (v_org,v_key,pg_catalog.to_jsonb(p_visible),'privacy')
  ON CONFLICT (organization_id,key) DO UPDATE
    SET value=EXCLUDED.value,category=EXCLUDED.category,updated_at=pg_catalog.now();

  RETURN pg_catalog.jsonb_build_object('surface',p_surface,'visible',p_visible);
END;
$function$;

REVOKE ALL ON FUNCTION public.set_customer_money_display_policy(text,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.set_customer_money_display_policy(text,boolean) TO authenticated;
COMMENT ON FUNCTION public.set_customer_money_display_policy(text,boolean) IS
  'Admin/manager-only tenant-scoped configuration for customer cart/checkout or order financial display. Missing settings mean hidden.';

CREATE OR REPLACE FUNCTION public.get_customer_checkout_preview(p_items jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_customer uuid := public.current_customer_id();
  v_org uuid := public.current_organization_id();
  v_result jsonb;
  v_visible boolean := false;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_line_total numeric;
  v_total numeric := 0;
  v_items jsonb := '[]'::jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL OR v_customer IS NULL OR v_org IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active AND p.organization_id=v_org) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated active customer required for checkout preview';
  END IF;

  -- Reuse existing validation for identity, active catalog, quantity and stock rules.
  v_result := public.validate_checkout_cart(p_items);

  SELECT COALESCE(
    CASE
      WHEN pg_catalog.jsonb_typeof(s.value)='boolean' THEN (s.value #>> '{}')::boolean
      WHEN pg_catalog.jsonb_typeof(s.value)='string' THEN pg_catalog.lower(s.value #>> '{}')='true'
      ELSE false
    END,false
  ) INTO v_visible
    FROM public.admin_settings s
   WHERE s.organization_id=v_org AND s.key='customer_cart_amounts_visible'
   LIMIT 1;
  v_visible := COALESCE(v_visible,false);
  IF NOT v_visible THEN
    RETURN v_result || pg_catalog.jsonb_build_object('amounts_visible',false);
  END IF;

  FOR v_item IN SELECT entry.value FROM pg_catalog.jsonb_array_elements(v_result->'items') AS entry(value)
  LOOP
    v_product_id := (v_item->>'product_id')::uuid;
    v_quantity := (v_item->>'quantity')::numeric;
    SELECT p.unit_price INTO v_unit_price
      FROM public.get_storefront_product_prices(ARRAY[v_product_id],v_quantity) p
     WHERE p.product_id=v_product_id;

    IF NOT FOUND OR v_unit_price IS NULL OR v_unit_price<0
       OR v_unit_price::text IN ('NaN','Infinity','-Infinity')
       OR v_quantity IS NULL OR v_quantity<>pg_catalog.trunc(v_quantity) OR v_quantity<1 THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='server could not verify a valid customer-tier price for every cart item';
    END IF;

    v_line_total := pg_catalog.round(v_unit_price*v_quantity,2);
    v_total := v_total+v_line_total;
    v_items := v_items || pg_catalog.jsonb_build_array(v_item || pg_catalog.jsonb_build_object('unit_price',v_unit_price,'line_total',v_line_total));
  END LOOP;

  RETURN v_result || pg_catalog.jsonb_build_object('items',v_items,'amounts_visible',true,'total_amount',v_total);
END;
$function$;

REVOKE ALL ON FUNCTION public.get_customer_checkout_preview(jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_checkout_preview(jsonb) TO authenticated;
COMMENT ON FUNCTION public.get_customer_checkout_preview(jsonb) IS
  'Customer-scoped checkout validation; cart money is returned only when the active organization explicitly enables customer_cart_amounts_visible. All prices come from the authoritative tier/quantity resolver.';

CREATE OR REPLACE FUNCTION public.get_customer_order_financials(p_order_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_customer uuid := public.current_customer_id();
  v_org uuid := public.current_organization_id();
  v_order public.orders%ROWTYPE;
  v_currency text;
  v_visible boolean := false;
  v_items jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL OR v_customer IS NULL OR v_org IS NULL
     OR NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active AND p.organization_id=v_org)
     OR NOT public.current_customer_can('orders.read') THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active customer with order-read permission required';
  END IF;

  SELECT o.* INTO v_order FROM public.orders o
   WHERE o.id=p_order_id AND o.customer_id=v_customer AND o.organization_id=v_org;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='الطلب غير موجود أو غير متاح لهذا الحساب';
  END IF;

  SELECT org.currency INTO v_currency FROM public.organizations org WHERE org.id=v_org;
  SELECT COALESCE(
    CASE
      WHEN pg_catalog.jsonb_typeof(s.value)='boolean' THEN (s.value #>> '{}')::boolean
      WHEN pg_catalog.jsonb_typeof(s.value)='string' THEN pg_catalog.lower(s.value #>> '{}')='true'
      ELSE false
    END,false
  ) INTO v_visible
    FROM public.admin_settings s
   WHERE s.organization_id=v_org AND s.key='customer_order_amounts_visible'
   LIMIT 1;
  v_visible := COALESCE(v_visible,false);

  SELECT COALESCE(
    pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'id',oi.id,
      'unit_price',CASE WHEN v_visible THEN oi.unit_price_snapshot ELSE NULL END,
      'line_total',CASE WHEN v_visible THEN oi.line_total ELSE NULL END
    ) ORDER BY oi.id),'[]'::jsonb
  ) INTO v_items
    FROM public.order_items oi WHERE oi.order_id=v_order.id;

  RETURN pg_catalog.jsonb_build_object(
    'amounts_visible',v_visible,
    'currency',v_currency,
    'total_amount',CASE WHEN v_visible THEN v_order.total_amount ELSE NULL END,
    'items',v_items
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.get_customer_order_financials(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.get_customer_order_financials(uuid) TO authenticated;
COMMENT ON FUNCTION public.get_customer_order_financials(uuid) IS
  'Returns financial fields only for the active customer’s own tenant-bound order and only when customer_order_amounts_visible is explicitly true; otherwise amounts are NULL.';

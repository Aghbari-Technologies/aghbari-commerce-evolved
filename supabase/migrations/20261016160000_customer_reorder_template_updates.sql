-- Customer-owned reorder-template editing is serialized and transactionally replaces lines.
CREATE OR REPLACE FUNCTION public.update_reorder_template(p_template_id uuid,p_name text,p_lines jsonb)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_customer uuid;
  v_org uuid;
  v_template uuid;
  v_line jsonb;
  v_product public.products%ROWTYPE;
  v_qty numeric;
  v_name text := pg_catalog.btrim(coalesce(p_name,''));
  v_count integer;
BEGIN
  IF v_profile IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='sign in required'; END IF;
  IF p_template_id IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='template id required'; END IF;
  IF pg_catalog.length(v_name)<2 OR pg_catalog.length(v_name)>100 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='template name must be 2 to 100 characters'; END IF;
  IF p_lines IS NULL OR pg_catalog.jsonb_typeof(p_lines)<>'array' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='template lines must be an array'; END IF;
  v_count := pg_catalog.jsonb_array_length(p_lines);
  IF v_count<1 OR v_count>100 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='template must contain between 1 and 100 lines'; END IF;

  SELECT c.id,c.organization_id INTO v_customer,v_org
    FROM public.customers c WHERE c.profile_id=v_profile ORDER BY c.created_at LIMIT 1;
  IF v_customer IS NULL OR v_org IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer account required'; END IF;

  SELECT t.id INTO v_template FROM public.reorder_templates t
   WHERE t.id=p_template_id AND t.customer_id=v_customer AND t.organization_id=v_org
   FOR UPDATE;
  IF v_template IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='template not owned by this customer'; END IF;

  UPDATE public.reorder_templates SET name=v_name,updated_at=pg_catalog.now()
   WHERE id=v_template AND customer_id=v_customer AND organization_id=v_org;
  DELETE FROM public.reorder_template_items WHERE template_id=v_template AND organization_id=v_org;

  FOR v_line IN SELECT value FROM pg_catalog.jsonb_array_elements(p_lines) LOOP
    IF nullif(pg_catalog.btrim(v_line->>'product_id'),'') IS NULL THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='product_id required'; END IF;
    BEGIN v_qty := (v_line->>'quantity')::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid quantity'; END;
    IF v_qty IS NULL OR v_qty<>pg_catalog.trunc(v_qty) OR v_qty<1 OR v_qty>10000 THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='quantity must be a positive integer not exceeding 10000';
    END IF;
    SELECT p.* INTO v_product FROM public.products p
     WHERE p.id=(v_line->>'product_id')::uuid AND p.organization_id=v_org AND p.status='active';
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='product unavailable'; END IF;
    INSERT INTO public.reorder_template_items(organization_id,template_id,product_id,item_code,product_name_snapshot,quantity)
    VALUES(v_org,v_template,v_product.id,v_product.item_code,v_product.name,v_qty);
  END LOOP;
  RETURN v_template;
END;
$$;
REVOKE ALL ON FUNCTION public.update_reorder_template(uuid,text,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.update_reorder_template(uuid,text,jsonb) TO authenticated;

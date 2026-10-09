-- Tenant-scope the newly introduced tables and harden helper RPCs.
CREATE OR REPLACE FUNCTION public.current_profile_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT p.id FROM public.profiles p WHERE p.auth_user_id = auth.uid() LIMIT 1;
$$;
REVOKE ALL ON FUNCTION public.current_profile_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_profile_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles r
    WHERE r.profile_id = public.current_profile_id()
      AND r.role IN ('admin','manager','staff')
  );
$$;
REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

DROP POLICY IF EXISTS customer_invoices_staff_all ON public.customer_invoices;
CREATE POLICY customer_invoices_staff_all ON public.customer_invoices FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS customer_invoice_items_staff_all ON public.customer_invoice_items;
CREATE POLICY customer_invoice_items_staff_all ON public.customer_invoice_items FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS customer_payments_staff_read ON public.customer_payments;
CREATE POLICY customer_payments_staff_read ON public.customer_payments FOR SELECT TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS sales_quotes_staff_all ON public.sales_quotes;
CREATE POLICY sales_quotes_staff_all ON public.sales_quotes FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS sales_quote_items_staff_all ON public.sales_quote_items;
CREATE POLICY sales_quote_items_staff_all ON public.sales_quote_items FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS reorder_templates_staff_all ON public.reorder_templates;
CREATE POLICY reorder_templates_staff_all ON public.reorder_templates FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

DROP POLICY IF EXISTS reorder_template_items_staff_all ON public.reorder_template_items;
CREATE POLICY reorder_template_items_staff_all ON public.reorder_template_items FOR ALL TO authenticated
USING (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()))
WITH CHECK (public.is_staff() AND organization_id = (SELECT p.organization_id FROM public.profiles p WHERE p.id=public.current_profile_id()));

CREATE OR REPLACE FUNCTION public.respond_to_sales_quote(
  p_quote_id uuid, p_prices jsonb, p_response_note text DEFAULT NULL, p_valid_until timestamptz DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_quote public.sales_quotes%ROWTYPE;
  v_line jsonb;
  v_item_id uuid;
  v_price numeric;
  v_count integer;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff permission required'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles p WHERE p.id=v_profile;
  IF v_org IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff organization context required'; END IF;
  SELECT q.* INTO v_quote FROM public.sales_quotes q WHERE q.id=p_quote_id AND q.organization_id=v_org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='quote not found in this organization'; END IF;
  IF v_quote.status NOT IN ('requested','quoted') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='quote is not open for pricing'; END IF;
  IF p_prices IS NULL OR pg_catalog.jsonb_typeof(p_prices)<>'array' THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='prices must be an array'; END IF;
  v_count:=pg_catalog.jsonb_array_length(p_prices);
  IF v_count<1 OR v_count>100 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid quote line count'; END IF;
  FOR v_line IN SELECT value FROM pg_catalog.jsonb_array_elements(p_prices) LOOP
    BEGIN v_item_id := (v_line->>'item_id')::uuid; v_price := (v_line->>'unit_price')::numeric;
    EXCEPTION WHEN invalid_text_representation OR numeric_value_out_of_range THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid quote item or price'; END;
    IF v_price IS NULL OR v_price::text IN ('NaN','Infinity','-Infinity') OR v_price<0 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='quote price must be finite and nonnegative'; END IF;
    UPDATE public.sales_quote_items SET quoted_unit_price=v_price
     WHERE id=v_item_id AND quote_id=v_quote.id AND organization_id=v_org;
    IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='quote item does not belong to this quote'; END IF;
  END LOOP;
  IF (SELECT count(*) FROM public.sales_quote_items i WHERE i.quote_id=v_quote.id AND i.organization_id=v_org)<>v_count
     OR EXISTS(SELECT 1 FROM public.sales_quote_items i WHERE i.quote_id=v_quote.id AND i.organization_id=v_org AND i.quoted_unit_price IS NULL) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='a price is required for every quote line';
  END IF;
  IF p_valid_until IS NOT NULL AND p_valid_until<pg_catalog.now() THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='quote validity must be in the future'; END IF;
  UPDATE public.sales_quotes SET status='quoted',response_note=pg_catalog.left(pg_catalog.btrim(coalesce(p_response_note,'')),1000),
    responded_by=v_profile,quoted_at=pg_catalog.now(),valid_until=p_valid_until,updated_at=pg_catalog.now() WHERE id=v_quote.id;
END;
$$;
REVOKE ALL ON FUNCTION public.respond_to_sales_quote(uuid,jsonb,text,timestamptz) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.respond_to_sales_quote(uuid,jsonb,text,timestamptz) TO authenticated;

CREATE OR REPLACE FUNCTION public.record_customer_payment(
  p_invoice_id uuid,p_amount numeric,p_payment_method text,p_reference text DEFAULT NULL,p_notes text DEFAULT NULL
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_invoice public.customer_invoices%ROWTYPE;
  v_paid numeric(15,2);
  v_payment uuid;
  v_method text := pg_catalog.lower(pg_catalog.btrim(coalesce(p_payment_method,'')));
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff permission required to record payments'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles p WHERE p.id=v_profile;
  IF v_org IS NULL THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff organization context required'; END IF;
  IF p_amount IS NULL OR p_amount::text IN ('NaN','Infinity','-Infinity') OR p_amount<=0 THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='payment amount must be finite and greater than zero'; END IF;
  IF v_method NOT IN ('cash','transfer','card','credit_adjustment','other') THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='invalid payment method'; END IF;
  SELECT i.* INTO v_invoice FROM public.customer_invoices i WHERE i.id=p_invoice_id AND i.organization_id=v_org FOR UPDATE;
  IF NOT FOUND OR v_invoice.status='void' THEN RAISE EXCEPTION USING ERRCODE='P0002', MESSAGE='active invoice not found in this organization'; END IF;
  SELECT coalesce(sum(p.amount),0) INTO v_paid FROM public.customer_payments p WHERE p.invoice_id=v_invoice.id;
  IF v_paid+round(p_amount,2)>v_invoice.total_amount THEN RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='payment exceeds invoice balance'; END IF;
  INSERT INTO public.customer_payments(organization_id,customer_id,invoice_id,amount,payment_method,reference,notes,paid_at,created_by)
  VALUES(v_invoice.organization_id,v_invoice.customer_id,v_invoice.id,round(p_amount,2),v_method,
    nullif(pg_catalog.left(pg_catalog.btrim(coalesce(p_reference,'')),200),''),
    nullif(pg_catalog.left(pg_catalog.btrim(coalesce(p_notes,'')),1000),''),pg_catalog.now(),v_profile)
  RETURNING id INTO v_payment;
  RETURN v_payment;
END;
$$;
REVOKE ALL ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_customer_payment(uuid,numeric,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_invoice_for_confirmed_order()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_invoice uuid;
  v_subtotal numeric(15,2);
  v_org uuid;
BEGIN
  IF NEW.status <> 'confirmed' OR OLD.status IS NOT DISTINCT FROM NEW.status THEN RETURN NEW; END IF;
  IF NOT public.is_staff() THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='staff confirmation required to issue invoice'; END IF;
  SELECT p.organization_id INTO v_org FROM public.profiles p WHERE p.id=public.current_profile_id();
  IF v_org IS NULL OR v_org<>NEW.organization_id THEN RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='order belongs to a different organization'; END IF;
  SELECT coalesce(sum(oi.line_total),0)::numeric(15,2) INTO v_subtotal FROM public.order_items oi WHERE oi.order_id=NEW.id;
  INSERT INTO public.customer_invoices(organization_id,customer_id,order_id,invoice_number,status,issued_at,currency,subtotal,tax_amount,total_amount)
  VALUES(NEW.organization_id,NEW.customer_id,NEW.id,
    'INV-' || pg_catalog.to_char(pg_catalog.now(),'YYMMDD') || '-' || pg_catalog.upper(pg_catalog.substr(pg_catalog.replace(pg_catalog.gen_random_uuid()::text,'-',''),1,8)),
    'issued',pg_catalog.now(),'YER',v_subtotal,0,v_subtotal)
  ON CONFLICT(order_id) DO NOTHING RETURNING id INTO v_invoice;
  IF v_invoice IS NOT NULL THEN
    INSERT INTO public.customer_invoice_items(organization_id,invoice_id,product_id,item_code,description,unit,quantity,unit_price,line_total)
    SELECT NEW.organization_id,v_invoice,oi.product_id,oi.item_code,oi.product_name_snapshot,oi.unit_snapshot,oi.quantity,oi.unit_price_snapshot,oi.line_total
      FROM public.order_items oi WHERE oi.order_id=NEW.id;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.issue_invoice_for_confirmed_order() FROM PUBLIC, anon;

-- Keep bounded detail payloads for predictable client/PDF cost, while calculating
-- account totals and each displayed invoice balance over the complete tenant-bound ledger.
CREATE OR REPLACE FUNCTION public.get_customer_account_statement()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_customer uuid;
  v_org uuid;
  v_invoices jsonb;
  v_payments jsonb;
  v_invoice_count bigint;
  v_payment_count bigint;
  v_totals_by_currency jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL OR NOT EXISTS (
    SELECT 1
      FROM public.profiles p
     WHERE p.id=v_profile
       AND p.auth_user_id=auth.uid()
       AND p.is_active
  ) THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated active customer required for account statement';
  END IF;

  SELECT c.id, c.organization_id INTO v_customer, v_org
    FROM public.customers c
   WHERE c.profile_id=v_profile
   ORDER BY c.created_at, c.id
   LIMIT 1;

  IF v_customer IS NULL OR v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer account is not linked to the active profile';
  END IF;

  -- Counts and summary totals are derived from all rows. Monetary totals exclude void
  -- invoices and never substitute malformed/missing values with zero (columns are numeric
  -- and NOT NULL under the finance schema). Currency totals are never combined.
  SELECT count(*) INTO v_invoice_count
    FROM public.customer_invoices ci
   WHERE ci.organization_id=v_org AND ci.customer_id=v_customer;

  SELECT count(*) INTO v_payment_count
    FROM public.customer_payments cp
   WHERE cp.organization_id=v_org AND cp.customer_id=v_customer;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'currency',t.currency,
    'invoiced',t.invoiced,
    'paid',t.paid,
    'outstanding',t.outstanding,
    'invoice_count',t.invoice_count
  ) ORDER BY t.currency),'[]'::jsonb)
    INTO v_totals_by_currency
    FROM (
      SELECT
        ci.currency,
        sum(ci.total_amount) FILTER (WHERE ci.status <> 'void') AS invoiced,
        sum(coalesce(p.paid_amount,0)) FILTER (WHERE ci.status <> 'void') AS paid,
        sum(greatest(ci.total_amount - coalesce(p.paid_amount,0),0)) FILTER (WHERE ci.status <> 'void') AS outstanding,
        count(*) FILTER (WHERE ci.status <> 'void') AS invoice_count
      FROM public.customer_invoices ci
      LEFT JOIN LATERAL (
        SELECT sum(cp.amount) AS paid_amount
          FROM public.customer_payments cp
         WHERE cp.organization_id=ci.organization_id
           AND cp.customer_id=ci.customer_id
           AND cp.invoice_id=ci.id
      ) p ON true
      WHERE ci.organization_id=v_org AND ci.customer_id=v_customer
      GROUP BY ci.currency
      HAVING count(*) FILTER (WHERE ci.status <> 'void') > 0
    ) t;

  -- The detail arrays remain capped. Their per-invoice balance fields are separately
  -- aggregated per invoice, so a displayed row does not depend on its payment appearing
  -- in the most recent 500 payment details.
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',i.id,
    'invoice_number',i.invoice_number,
    'order_id',i.order_id,
    'customer_id',i.customer_id,
    'status',i.status,
    'issued_at',i.issued_at,
    'due_at',i.due_at,
    'currency',i.currency,
    'subtotal',i.subtotal,
    'tax_amount',i.tax_amount,
    'total_amount',i.total_amount,
    'paid_amount',CASE WHEN i.status='void' THEN 0 ELSE i.paid_amount END,
    'outstanding_amount',CASE WHEN i.status='void' THEN 0 ELSE greatest(i.total_amount-i.paid_amount,0) END
  ) ORDER BY i.issued_at DESC,i.id),'[]'::jsonb)
    INTO v_invoices
    FROM (
      SELECT ci.*,coalesce(p.paid_amount,0) AS paid_amount
      FROM public.customer_invoices ci
      LEFT JOIN LATERAL (
        SELECT sum(cp.amount) AS paid_amount
          FROM public.customer_payments cp
         WHERE cp.organization_id=ci.organization_id
           AND cp.customer_id=ci.customer_id
           AND cp.invoice_id=ci.id
      ) p ON true
      WHERE ci.organization_id=v_org AND ci.customer_id=v_customer
      ORDER BY ci.issued_at DESC,ci.id
      LIMIT 200
    ) i;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,
    'invoice_id',p.invoice_id,
    'amount',p.amount,
    'paid_at',p.paid_at
  ) ORDER BY p.paid_at DESC,p.id),'[]'::jsonb)
    INTO v_payments
    FROM (
      SELECT cp.*
        FROM public.customer_payments cp
       WHERE cp.organization_id=v_org AND cp.customer_id=v_customer
       ORDER BY cp.paid_at DESC,cp.id
       LIMIT 500
    ) p;

  RETURN jsonb_build_object(
    'invoices',v_invoices,
    'payments',v_payments,
    'summary',jsonb_build_object(
      'invoice_count',v_invoice_count,
      'payment_count',v_payment_count,
      'totals_by_currency',v_totals_by_currency
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_customer_account_statement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_customer_account_statement() TO authenticated;
COMMENT ON FUNCTION public.get_customer_account_statement() IS
  'Returns the authenticated active customer own account statement. Detail arrays are bounded (200 invoices/500 payments); summary totals and per-invoice balances are aggregated across the entire authorized ledger and grouped by currency.';

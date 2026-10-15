-- Multi-contact customer records, scoped to the customer business account.
CREATE TABLE IF NOT EXISTS public.customer_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  full_name text NOT NULL CHECK (pg_catalog.length(pg_catalog.btrim(full_name)) BETWEEN 2 AND 120),
  job_title text,
  phone text,
  email text,
  contact_type text NOT NULL DEFAULT 'general'
    CHECK (contact_type IN ('general','purchasing','finance','warehouse','management')),
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  updated_at timestamptz NOT NULL DEFAULT pg_catalog.now(),
  CHECK (NOT is_primary OR is_active)
);

CREATE INDEX IF NOT EXISTS customer_contacts_customer_idx
  ON public.customer_contacts(customer_id, is_active DESC, is_primary DESC, full_name);
CREATE UNIQUE INDEX IF NOT EXISTS customer_contacts_one_active_primary_idx
  ON public.customer_contacts(customer_id) WHERE is_primary AND is_active;

ALTER TABLE public.customer_contacts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.customer_contacts FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS customer_contacts_read_scoped ON public.customer_contacts;
CREATE POLICY customer_contacts_read_scoped ON public.customer_contacts
  FOR SELECT TO authenticated
  USING (
    (
      public.is_staff()
      AND organization_id = (
        SELECT p.organization_id
        FROM public.profiles p
        WHERE p.id = public.current_profile_id()
          AND p.auth_user_id = auth.uid()
          AND p.is_active
      )
    )
    OR EXISTS (
      SELECT 1
      FROM public.customers c
      JOIN public.profiles p ON p.id = c.profile_id
      WHERE c.id = customer_contacts.customer_id
        AND c.organization_id = customer_contacts.organization_id
        AND p.id = public.current_profile_id()
        AND p.auth_user_id = auth.uid()
        AND p.is_active
    )
  );

CREATE OR REPLACE FUNCTION public.list_customer_contacts(p_customer_id uuid DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_customer uuid;
  v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated account required';
  END IF;

  SELECT p.organization_id INTO v_org
  FROM public.profiles p
  WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active organization profile required';
  END IF;

  IF public.is_staff() THEN
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='select a customer account to list its contacts';
    END IF;
    SELECT c.id INTO v_customer
    FROM public.customers c
    WHERE c.id=p_customer_id AND c.organization_id=v_org;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer is outside the current organization';
    END IF;
  ELSE
    SELECT c.id INTO v_customer
    FROM public.customers c
    WHERE c.profile_id=v_profile AND c.organization_id=v_org
    ORDER BY c.created_at,c.id
    LIMIT 1;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer account is not linked to this profile';
    END IF;
    IF p_customer_id IS NOT NULL AND p_customer_id IS DISTINCT FROM v_customer THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='cannot list contacts for another customer account';
    END IF;
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',c.id,
    'full_name',c.full_name,
    'job_title',c.job_title,
    'phone',c.phone,
    'email',c.email,
    'contact_type',c.contact_type,
    'is_primary',c.is_primary,
    'is_active',c.is_active,
    'created_at',c.created_at,
    'updated_at',c.updated_at
  ) ORDER BY c.is_primary DESC,c.is_active DESC,c.full_name,c.id),'[]'::jsonb)
  INTO v_result
  FROM public.customer_contacts c
  WHERE c.customer_id=v_customer AND c.organization_id=v_org;

  RETURN v_result;
END;
$function$;

CREATE OR REPLACE FUNCTION public.save_customer_contact(
  p_contact_id uuid,
  p_customer_id uuid,
  p_full_name text,
  p_job_title text,
  p_phone text,
  p_email text,
  p_contact_type text,
  p_is_primary boolean,
  p_is_active boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_customer uuid;
  v_contact_id uuid;
  v_old public.customer_contacts%ROWTYPE;
  v_had_old boolean := false;
  v_make_primary boolean := false;
  v_replacement_id uuid;
  v_full_name text := pg_catalog.btrim(coalesce(p_full_name,''));
  v_job_title text := nullif(pg_catalog.btrim(coalesce(p_job_title,'')),'');
  v_phone text := nullif(pg_catalog.btrim(coalesce(p_phone,'')),'');
  v_email text := pg_catalog.lower(nullif(pg_catalog.btrim(coalesce(p_email,'')),''));
  v_contact_type text := coalesce(p_contact_type,'general');
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated account required';
  END IF;

  SELECT p.organization_id INTO v_org
  FROM public.profiles p
  WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active organization profile required';
  END IF;

  IF public.is_staff() THEN
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='customer id is required for staff contact management';
    END IF;
    SELECT c.id INTO v_customer
    FROM public.customers c
    WHERE c.id=p_customer_id AND c.organization_id=v_org
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer is outside the current organization';
    END IF;
  ELSE
    SELECT c.id INTO v_customer
    FROM public.customers c
    WHERE c.profile_id=v_profile AND c.organization_id=v_org
    ORDER BY c.created_at,c.id
    LIMIT 1
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer account is not linked to this profile';
    END IF;
    IF p_customer_id IS NOT NULL AND p_customer_id IS DISTINCT FROM v_customer THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='cannot change contacts for another customer account';
    END IF;
  END IF;

  IF pg_catalog.length(v_full_name) NOT BETWEEN 2 AND 120
     OR pg_catalog.length(coalesce(v_job_title,''))>100
     OR pg_catalog.length(coalesce(v_phone,''))>32
     OR pg_catalog.length(coalesce(v_email,''))>254
     OR v_contact_type NOT IN ('general','purchasing','finance','warehouse','management')
     OR (v_phone IS NULL AND v_email IS NULL)
     OR (v_email IS NOT NULL AND (pg_catalog.position('@' in v_email)<2 OR pg_catalog.position('.' in pg_catalog.split_part(v_email,'@',2))<2))
     OR (coalesce(p_is_active,true)=false AND coalesce(p_is_primary,false)=true) THEN
    RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='customer contact fields are invalid';
  END IF;

  IF p_contact_id IS NOT NULL THEN
    SELECT c.* INTO v_old
    FROM public.customer_contacts c
    WHERE c.id=p_contact_id AND c.customer_id=v_customer AND c.organization_id=v_org
    FOR UPDATE;
    IF NOT FOUND THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='contact not found or not owned by this customer account';
    END IF;
    v_had_old := true;
  END IF;

  v_make_primary := coalesce(p_is_active,true)
    AND (
      coalesce(p_is_primary,false)
      OR (v_had_old AND v_old.is_primary)
      OR NOT EXISTS (
        SELECT 1 FROM public.customer_contacts c
        WHERE c.customer_id=v_customer AND c.organization_id=v_org
          AND c.is_active AND c.is_primary AND c.id IS DISTINCT FROM p_contact_id
      )
    );

  IF v_make_primary THEN
    UPDATE public.customer_contacts c
    SET is_primary=false,updated_by=v_profile,updated_at=pg_catalog.now()
    WHERE c.customer_id=v_customer AND c.organization_id=v_org
      AND c.id IS DISTINCT FROM p_contact_id AND c.is_primary;
  END IF;

  IF p_contact_id IS NULL THEN
    INSERT INTO public.customer_contacts(
      organization_id,customer_id,full_name,job_title,phone,email,contact_type,
      is_primary,is_active,created_by,updated_by
    )
    VALUES(
      v_org,v_customer,v_full_name,v_job_title,v_phone,v_email,v_contact_type,
      v_make_primary,coalesce(p_is_active,true),v_profile,v_profile
    )
    RETURNING id INTO v_contact_id;
  ELSE
    UPDATE public.customer_contacts
    SET full_name=v_full_name,job_title=v_job_title,phone=v_phone,email=v_email,
        contact_type=v_contact_type,is_primary=v_make_primary,
        is_active=coalesce(p_is_active,true),updated_by=v_profile,updated_at=pg_catalog.now()
    WHERE id=p_contact_id AND customer_id=v_customer AND organization_id=v_org
    RETURNING id INTO v_contact_id;
  END IF;

  IF v_had_old AND v_old.is_primary AND NOT coalesce(p_is_active,true) THEN
    SELECT c.id INTO v_replacement_id
    FROM public.customer_contacts c
    WHERE c.customer_id=v_customer AND c.organization_id=v_org AND c.is_active
    ORDER BY c.created_at,c.id
    LIMIT 1
    FOR UPDATE;
    IF v_replacement_id IS NOT NULL THEN
      UPDATE public.customer_contacts
      SET is_primary=true,updated_by=v_profile,updated_at=pg_catalog.now()
      WHERE id=v_replacement_id AND customer_id=v_customer;
    END IF;
  END IF;

  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,old_value,new_value)
  VALUES(
    v_org,v_profile,
    CASE WHEN p_contact_id IS NULL THEN 'customer_contact.created' ELSE 'customer_contact.updated' END,
    'customer_contact',v_contact_id,
    CASE WHEN v_had_old THEN pg_catalog.jsonb_build_object(
      'full_name',v_old.full_name,'phone',v_old.phone,'email',v_old.email,
      'contact_type',v_old.contact_type,'is_primary',v_old.is_primary,'is_active',v_old.is_active
    ) ELSE NULL END,
    pg_catalog.jsonb_build_object(
      'full_name',v_full_name,'phone',v_phone,'email',v_email,
      'contact_type',v_contact_type,'is_primary',v_make_primary,'is_active',coalesce(p_is_active,true)
    )
  );
  RETURN v_contact_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_customer_contact(p_contact_id uuid,p_customer_id uuid DEFAULT NULL)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  v_profile uuid := public.current_profile_id();
  v_org uuid;
  v_customer uuid;
  v_old public.customer_contacts%ROWTYPE;
  v_replacement_id uuid;
BEGIN
  IF auth.uid() IS NULL OR v_profile IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='authenticated account required';
  END IF;

  SELECT p.organization_id INTO v_org
  FROM public.profiles p
  WHERE p.id=v_profile AND p.auth_user_id=auth.uid() AND p.is_active;
  IF v_org IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='active organization profile required';
  END IF;

  IF public.is_staff() THEN
    IF p_customer_id IS NULL THEN
      RAISE EXCEPTION USING ERRCODE='22023', MESSAGE='customer id is required for staff contact management';
    END IF;
    SELECT c.id INTO v_customer
    FROM public.customers c WHERE c.id=p_customer_id AND c.organization_id=v_org FOR UPDATE;
  ELSE
    SELECT c.id INTO v_customer
    FROM public.customers c
    WHERE c.profile_id=v_profile AND c.organization_id=v_org
    ORDER BY c.created_at,c.id LIMIT 1 FOR UPDATE;
    IF p_customer_id IS NOT NULL AND p_customer_id IS DISTINCT FROM v_customer THEN
      RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='cannot delete contacts for another customer account';
    END IF;
  END IF;
  IF v_customer IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='customer account is unavailable';
  END IF;

  SELECT c.* INTO v_old
  FROM public.customer_contacts c
  WHERE c.id=p_contact_id AND c.customer_id=v_customer AND c.organization_id=v_org
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501', MESSAGE='contact not found or not owned by this customer account';
  END IF;

  DELETE FROM public.customer_contacts WHERE id=p_contact_id AND customer_id=v_customer AND organization_id=v_org;

  IF v_old.is_primary THEN
    SELECT c.id INTO v_replacement_id
    FROM public.customer_contacts c
    WHERE c.customer_id=v_customer AND c.organization_id=v_org AND c.is_active
    ORDER BY c.created_at,c.id
    LIMIT 1
    FOR UPDATE;
    IF v_replacement_id IS NOT NULL THEN
      UPDATE public.customer_contacts
      SET is_primary=true,updated_by=v_profile,updated_at=pg_catalog.now()
      WHERE id=v_replacement_id AND customer_id=v_customer;
    END IF;
  END IF;

  INSERT INTO public.audit_logs(organization_id,actor_id,action,entity_type,entity_id,old_value,new_value)
  VALUES(v_org,v_profile,'customer_contact.deleted','customer_contact',p_contact_id,
    pg_catalog.jsonb_build_object('full_name',v_old.full_name,'phone',v_old.phone,'email',v_old.email,
      'contact_type',v_old.contact_type,'is_primary',v_old.is_primary,'is_active',v_old.is_active),
    NULL);
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_customer_contacts(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.list_customer_contacts(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.save_customer_contact(uuid,uuid,text,text,text,text,text,boolean,boolean) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.save_customer_contact(uuid,uuid,text,text,text,text,text,boolean,boolean) TO authenticated;
REVOKE ALL ON FUNCTION public.delete_customer_contact(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.delete_customer_contact(uuid,uuid) TO authenticated;

DO $block$
BEGIN
  IF has_table_privilege('authenticated','public.customer_contacts','SELECT')
     OR has_table_privilege('authenticated','public.customer_contacts','INSERT')
     OR has_table_privilege('authenticated','public.customer_contacts','UPDATE')
     OR has_table_privilege('authenticated','public.customer_contacts','DELETE') THEN
    RAISE EXCEPTION 'authenticated must use scoped customer-contact RPCs instead of direct table access';
  END IF;
END
$block$;

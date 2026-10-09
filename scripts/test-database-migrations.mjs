import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import postgres from "postgres";

const connectionString = process.env.TEST_DATABASE_URL;
if (!connectionString) throw new Error("TEST_DATABASE_URL is required for isolated database migration tests.");

const db = postgres(connectionString, { max: 1, prepare: false, idle_timeout: 5 });

async function setIdentity(authUserId, email) {
  await db.unsafe("select set_config('request.jwt.claim.sub', $1, false)", [authUserId]);
  await db.unsafe("select set_config('request.jwt.claims', $1, false)", [
    JSON.stringify({ sub: authUserId, email, email_confirmed_at: new Date().toISOString(), role: "authenticated" }),
  ]);
}

async function expectFailure(label, action, pattern) {
  let caught;
  try {
    await action();
  } catch (error) {
    caught = error;
  }
  assert.ok(caught, label + " should fail");
  if (pattern) assert.match(String(caught.message), pattern, label + " should fail for the expected reason");
}

async function main() {
  await db.unsafe(`
    create extension if not exists pgcrypto;
    do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
    do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;
    create schema if not exists auth;
    create or replace function auth.uid() returns uuid
      language sql stable
      as $$ select coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
      )::uuid $$;
    create or replace function auth.jwt() returns jsonb
      language sql stable
      as $$ select coalesce(nullif(current_setting('request.jwt.claims', true), '')::jsonb, '{}'::jsonb) $$;
    grant usage on schema auth to anon, authenticated, service_role;
    grant execute on all functions in schema auth to anon, authenticated, service_role;
  `);

  const migrationDir = resolve(process.cwd(), "supabase/migrations");
  const migrations = (await readdir(migrationDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  assert.ok(migrations.length >= 7, "expected the original schema and six completion migrations");
  const migrationVersions = migrations.map((name) => name.slice(0, 14));
  assert.ok(migrationVersions.every((version) =>
    version.length === 14 && [...version].every((digit) => digit >= '0' && digit <= '9')),
    "each Supabase migration filename must start with a 14-digit version");
  assert.equal(new Set(migrationVersions).size, migrationVersions.length,
    "Supabase migration version prefixes must be unique; duplicate versions break migration tracking");

  for (const name of migrations) {
    const contents = await readFile(resolve(migrationDir, name), "utf8");
    await db.unsafe(contents);
    process.stdout.write("APPLIED " + name + "\n");
  }

  const productId = "a1000000-0000-0000-0000-000000000001";
  const organizationId = "a0000000-0000-0000-0000-000000000001";
  const profileId = "f1111111-1111-4111-8111-111111111111";
  const authUserId = "11111111-1111-4111-8111-111111111111";
  const secondProfileId = "f2222222-2222-4222-8222-222222222222";
  const secondAuthUserId = "22222222-2222-4222-8222-222222222222";
  const staffProfileId = "f0000000-0000-0000-0000-000000000001";
  const staffAuthUserId = "33333333-3333-4333-8333-333333333333";
  const otherOrganizationId = "a1111111-1111-4111-8111-111111111111";
  const otherProductId = "a1111111-1111-4111-8111-111111111112";

  await db.unsafe(
    `insert into public.profiles(id,auth_user_id,organization_id,full_name,email)
      values ($1,$2,$3,$4,$5), ($6,$7,$3,$8,$9)
      on conflict (id) do nothing`,
    [profileId, authUserId, organizationId, "CI Customer One", "ci-customer-one@example.test",
      secondProfileId, secondAuthUserId, "CI Customer Two", "ci-customer-two@example.test"],
  );
  await db.unsafe(
    `insert into public.user_roles(profile_id,role)
      values ($1,'customer'),($2,'customer')
      on conflict (profile_id,role) do nothing`,
    [profileId, secondProfileId],
  );
  await db.unsafe(
    `insert into public.customers(
       organization_id,profile_id,customer_code,business_name,contact_name,phone,email,tier,credit_limit,current_balance,status,approved_at
     ) values
       ($1,$2,'CI-CUST-01','CI Company One','CI Customer One','7771111111','ci-customer-one@example.test','wholesale',1000000,0,'approved',now()),
       ($1,$3,'CI-CUST-02','CI Company Two','CI Customer Two','7772222222','ci-customer-two@example.test','retail',100000,0,'approved',now())
     on conflict (organization_id,customer_code) do nothing`,
    [organizationId, profileId, secondProfileId],
  );
  await db.unsafe(
    "update public.profiles set auth_user_id=$1 where id=$2 and auth_user_id is null",
    [staffAuthUserId, staffProfileId],
  );
  const operationsStaffProfileId = "f4444444-4444-4444-8444-444444444444";
  const operationsStaffAuthUserId = "44444444-4444-4444-8444-444444444444";
  await db.unsafe(
    "insert into public.profiles(id,auth_user_id,organization_id,full_name,email,is_active) values($1,$2,$3,'CI Operations Staff','ci-operations-staff@example.test',true) on conflict(id) do nothing",
    [operationsStaffProfileId, operationsStaffAuthUserId, organizationId],
  );
  await db.unsafe(
    "insert into public.user_roles(profile_id,role) values($1,'staff') on conflict(profile_id,role) do nothing",
    [operationsStaffProfileId],
  );
  const accountantProfileId = "f5555555-5555-4555-8555-555555555555";
  const accountantAuthUserId = "55555555-5555-4555-8555-555555555555";
  await db.unsafe(
    "insert into public.profiles(id,auth_user_id,organization_id,full_name,email,is_active) values($1,$2,$3,'CI Accountant','ci-accountant@example.test',true) on conflict(id) do nothing",
    [accountantProfileId, accountantAuthUserId, organizationId],
  );
  await db.unsafe(
    "insert into public.user_roles(profile_id,role) values($1,'accountant') on conflict(profile_id,role) do nothing",
    [accountantProfileId],
  );
  await db.unsafe(
    "insert into public.organizations(id,name,currency) values($1,'Foreign organization','YER') on conflict(id) do nothing",
    [otherOrganizationId],
  );
  const foreignProfileId = "f6666666-6666-4666-8666-666666666666";
  const foreignAuthUserId = "66666666-6666-4666-8666-666666666666";
  await db.unsafe(
    "insert into public.profiles(id,auth_user_id,organization_id,full_name,email,is_active) values($1,$2,$3,'Foreign CI Profile','foreign-ci-profile@example.test',true) on conflict(id) do nothing",
    [foreignProfileId, foreignAuthUserId, otherOrganizationId],
  );
  await db.unsafe(
    "insert into public.user_roles(profile_id,role) values($1,'customer') on conflict(profile_id,role) do nothing",
    [foreignProfileId],
  );
  await db.unsafe(
    `insert into public.products(id,organization_id,name,item_code,unit,base_price,status)
      values($1,$2,'Foreign product','CI-FOREIGN-01','unit',1,'active')
      on conflict(id) do nothing`,
    [otherProductId, otherOrganizationId],
  );

  // The original schema seeded one wholesale price break at 10; migration 600 adds a second break.
  await db.unsafe(
    `insert into public.product_prices(product_id,tier,price,min_quantity,is_active)
      values($1,'wholesale',35000,20,true)`,
    [productId],
  );

  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");

  const previewInput10 = db.json([{ product_id: productId, quantity: 10 }]);
  const payloadCheck = await db.unsafe(
    "select jsonb_typeof($1::jsonb) as json_type, $1::jsonb as payload",
    [previewInput10],
  );
  process.stdout.write("JSONB PARAMETER CHECK " + JSON.stringify(payloadCheck[0]) + "\\n");
  const preview10 = await db.unsafe(
    "select public.validate_checkout_cart($1::jsonb) as result",
    [previewInput10],
  );
  assert.equal(Number(preview10[0].result.items[0].quantity), 10);
  assert.equal(preview10[0].result.pricing_verified, true);
  assert.ok(!("total_amount" in preview10[0].result), "customer cart validation must not return a total");
  assert.ok(!("unit_price" in preview10[0].result.items[0]), "customer cart validation must not return unit prices");

  const preview20 = await db.unsafe(
    "select public.validate_checkout_cart($1::jsonb) as result",
    [db.json([{ product_id: productId, quantity: 20 }])],
  );
  assert.equal(Number(preview20[0].result.items[0].quantity), 20);
  assert.ok(!("total_amount" in preview20[0].result));

  await expectFailure(
    "cross-tenant cart validation",
    () => db.unsafe("select public.validate_checkout_cart($1::jsonb)", [db.json([{ product_id: otherProductId, quantity: 1 }])]),
    /unavailable|organization/i,
  );

  // Test monetary tier calculation only inside the trusted test role; the customer RPC is non-financial.
  await db.unsafe("reset role");
  const price10 = await db.unsafe("select public.customer_product_unit_price($1::uuid,$2::uuid,'wholesale',10) as price", [productId, organizationId]);
  const price20 = await db.unsafe("select public.customer_product_unit_price($1::uuid,$2::uuid,'wholesale',20) as price", [productId, organizationId]);
  assert.equal(Number(price10[0].price), 37000, "quantity 10 should use the wholesale price break of 37,000");
  assert.equal(Number(price20[0].price), 35000, "quantity 20 should use the more favorable wholesale price break of 35,000");
  await db.unsafe("set role authenticated");

  const itemPayload = [{ product_id: productId, quantity: 10 }];
  const orderArgs = [
    db.json(itemPayload), "CI smoke order", "CI Company One", "CI Customer One",
    "7771111111", "credit", "ci-idempotency-key-000001",
  ];
  const firstOrder = await db.unsafe(
    "select public.submit_customer_order($1::jsonb,$2,$3,$4,$5,$6,$7) as result",
    orderArgs,
  );
  const order = firstOrder[0].result;
  assert.equal(order.status, "pending");
  assert.ok(!("total_amount" in order), "customer order response must not disclose monetary values");
  assert.equal(order.idempotent_replay, false);
  // Verify server-computed financial storage as the trusted test owner, not through customer grants.
  await db.unsafe("reset role");
  const persistedOrderAmount = await db.unsafe("select total_amount from public.orders where id=$1", [order.id]);
  assert.equal(Number(persistedOrderAmount[0].total_amount), 370000, "server order total must match tier pricing");
  await db.unsafe("set role authenticated");

  const customerSafeOrder = await db.unsafe(
    "select id,order_number,status,total_items,created_at,quantity_review_required,customer_adjustment_note,customer_payment_requested_at,payment_request_status from public.orders where id=$1",
    [order.id],
  );
  assert.equal(customerSafeOrder.length, 1, "customer may read safe order status fields");
  await expectFailure(
    "customer direct order total access",
    () => db.unsafe("select total_amount from public.orders where id=$1", [order.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer SELECT * on orders",
    () => db.unsafe("select * from public.orders where id=$1", [order.id]),
    /permission denied/i,
  );

  const customerSafeItems = await db.unsafe(
    "select id,order_id,item_code,product_name_snapshot,unit_snapshot,quantity,requested_quantity,approved_quantity from public.order_items where order_id=$1",
    [order.id],
  );
  assert.equal(customerSafeItems.length, 1, "customer may read safe order-line fields");
  assert.equal(Number(customerSafeItems[0].quantity), 10);
  for (const column of ["unit_price_snapshot","line_total","approved_unit_price","proposed_unit_price"]) {
    await expectFailure(
      "customer direct order-line access to " + column,
      () => db.unsafe("select " + column + " from public.order_items where order_id=$1", [order.id]),
      /permission denied/i,
    );
  }
  await expectFailure(
    "customer SELECT * on order_items",
    () => db.unsafe("select * from public.order_items where order_id=$1", [order.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer cannot call staff order RPC",
    () => db.unsafe("select * from public.fetch_staff_orders()"),
    /staff role required/i,
  );
  await expectFailure(
    "customer cannot call staff order-line RPC",
    () => db.unsafe("select * from public.fetch_staff_order_items($1::uuid)", [order.id]),
    /staff role required/i,
  );

  const replay = await db.unsafe(
    "select public.submit_customer_order($1::jsonb,$2,$3,$4,$5,$6,$7) as result",
    orderArgs,
  );
  assert.equal(replay[0].result.id, order.id, "same idempotency key and payload must return the original order");
  assert.equal(replay[0].result.idempotent_replay, true);
  await expectFailure(
    "idempotency payload mismatch",
    () => db.unsafe(
      "select public.submit_customer_order($1::jsonb,$2,$3,$4,$5,$6,$7)",
      [db.json([{ product_id: productId, quantity: 11 }]), ...orderArgs.slice(1)],
    ),
    /different|مختلفة/i,
  );
  await db.unsafe("reset role");
  const orderCount = await db.unsafe(
    "select count(*)::int as count from public.orders where created_by=$1 and idempotency_key=$2",
    [profileId, "ci-idempotency-key-000001"],
  );
  assert.equal(orderCount[0].count, 1, "a replay must not create a duplicate order");
  await db.unsafe("set role authenticated");

  const firstQuote = await db.unsafe(
    "select public.request_sales_quote($1::jsonb,$2) as id",
    [db.json([{ product_id: productId, quantity: 2 }]), "CI quotation"],
  );
  const firstQuoteId = firstQuote[0].id;
  const firstQuoteItems = await db.unsafe(
    "select id from public.sales_quote_items where quote_id=$1",
    [firstQuoteId],
  );
  assert.equal(firstQuoteItems.length, 1, "RFQ should create a persisted quote line");

  await db.unsafe("reset role");
  await setIdentity(secondAuthUserId, "ci-customer-two@example.test");
  await db.unsafe("set role authenticated");
  const secondIdentityQuote = await db.unsafe(
    "select public.request_sales_quote($1::jsonb,$2) as id",
    [db.json([{ product_id: productId, quantity: 1 }]), "CI second customer RFQ"],
  );
  const secondQuoteId = secondIdentityQuote[0].id;
  const secondVisible = await db.unsafe("select id from public.sales_quotes");
  assert.ok(secondVisible.some((row) => row.id === secondQuoteId), "customer two must see their own quote");
  assert.ok(!secondVisible.some((row) => row.id === firstQuoteId), "customer two must not see customer one's quote");

  await db.unsafe("reset role");
  await setIdentity(staffAuthUserId, "admin@aghbari.ye");
  await db.unsafe("set role authenticated");
  await db.unsafe(
    "select public.respond_to_sales_quote($1::uuid,$2::jsonb,$3,$4::timestamptz)",
    [firstQuoteId, db.json([{ item_id: firstQuoteItems[0].id, unit_price: 12345 }]), "CI quote priced", new Date(Date.now() + 86400000).toISOString()],
  );

  await db.unsafe("reset role");
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");
  const quoteAccept = await db.unsafe("select public.customer_respond_to_quote($1::uuid,true)", [firstQuoteId]);
  assert.ok(quoteAccept, "customer must be able to accept a quote for their account");

  const reorderId = await db.unsafe(
    "select public.save_reorder_template($1,$2::jsonb,null) as id",
    ["CI regular order", db.json([{ product_id: productId, quantity: 3 }])],
  );
  const reorderItems = await db.unsafe(
    "select count(*)::int as count from public.reorder_template_items where template_id=$1",
    [reorderId[0].id],
  );
  assert.equal(reorderItems[0].count, 1, "reorder template must persist its items");

  await db.unsafe("reset role");
  await setIdentity(staffAuthUserId, "admin@aghbari.ye");
  await db.unsafe("set role authenticated");
  const staffCustomers = await db.unsafe(
    "select id from public.customers where profile_id=$1 and organization_id=$2 limit 1",
    [profileId, organizationId],
  );
  assert.equal(staffCustomers.length, 1, "staff test customer must belong to the staff organization");

  const staffCreatedResult = await db.unsafe(
    "select public.create_staff_order($1::uuid,$2::jsonb,$3,$4,$5) as result",
    [staffCustomers[0].id,
      db.json([{ product_id: productId, quantity: 2, unit_price: 0.01, item_code: "FORGED-SKU", product_name: "Forged Product", unit: "forged" }]),
      "CI atomic staff-created order", "ci-staff-order-key-000001", "cash_on_delivery"],
  );
  const staffCreatedOrder = staffCreatedResult[0].result;
  assert.equal(staffCreatedOrder.status, "pending");
  assert.equal(staffCreatedOrder.idempotent_replay, false);
  assert.equal(Number(staffCreatedOrder.total_amount), 77000,
    "staff order price must come from the shared server resolver, not the forged unit_price of 0.01");

  const staffReplay = await db.unsafe(
    "select public.create_staff_order($1::uuid,$2::jsonb,$3,$4,$5) as result",
    [staffCustomers[0].id,
      db.json([{ product_id: productId, quantity: 2, unit_price: 999999, item_code: "DIFFERENT-CLIENT-CODE" }]),
      "CI atomic staff-created order", "ci-staff-order-key-000001", "cash_on_delivery"],
  );
  assert.equal(staffReplay[0].result.id, staffCreatedOrder.id, "an identical normalized retry must return the original order");
  assert.equal(staffReplay[0].result.idempotent_replay, true);

  await expectFailure(
    "staff idempotency key reused with a different order",
    () => db.unsafe(
      "select public.create_staff_order($1::uuid,$2::jsonb,$3,$4,$5)",
      [staffCustomers[0].id, db.json([{ product_id: productId, quantity: 3 }]),
        "CI atomic staff-created order", "ci-staff-order-key-000001", "cash_on_delivery"],
    ),
    /different order payload/i,
  );

  await expectFailure(
    "direct authenticated INSERT to orders",
    () => db.unsafe(
      "insert into public.orders(organization_id,customer_id,order_number,status,total_amount,total_items,created_by) values($1,$2,'CI-DIRECT-ORDER','pending',1,1,$3)",
      [organizationId, staffCustomers[0].id, staffProfileId],
    ),
    /permission denied/i,
  );
  await expectFailure(
    "direct authenticated INSERT to order_items",
    () => db.unsafe(
      "insert into public.order_items(order_id,product_id,item_code,product_name_snapshot,unit_snapshot,quantity,unit_price_snapshot,line_total,requested_quantity,approved_quantity,approved_unit_price) values($1,$2,'FORGED','Forged','unit',1,0.01,0.01,1,1,0.01)",
      [staffCreatedOrder.id, productId],
    ),
    /permission denied/i,
  );
  await expectFailure(
    "direct authenticated update of order total",
    () => db.unsafe("update public.orders set total_amount=0 where id=$1", [staffCreatedOrder.id]),
    /permission denied/i,
  );
  await expectFailure(
    "direct authenticated update of order-line price",
    () => db.unsafe("update public.order_items set unit_price_snapshot=0.01 where order_id=$1", [staffCreatedOrder.id]),
    /permission denied/i,
  );

  const staffCreatedItems = await db.unsafe(
    "select item_code,product_name_snapshot,unit_snapshot,quantity,unit_price_snapshot,line_total from public.fetch_staff_order_items($1::uuid)",
    [staffCreatedOrder.id],
  );
  assert.equal(staffCreatedItems.length, 1);
  assert.notEqual(staffCreatedItems[0].item_code, "FORGED-SKU", "order snapshot must use canonical server-side item code");
  assert.notEqual(staffCreatedItems[0].product_name_snapshot, "Forged Product", "order snapshot must use the persisted product name");
  assert.equal(Number(staffCreatedItems[0].unit_price_snapshot), 38500);
  assert.equal(Number(staffCreatedItems[0].line_total), 77000);
  process.stdout.write("PASS atomic tenant-bound staff order creation, server-side pricing, idempotency and direct-write denial\\n");

  const rollbackKey = "ci-staff-order-rollback-000001";
  await expectFailure(
    "staff order creation must roll back when a later item is outside the tenant",
    () => db.unsafe(
      "select public.create_staff_order($1::uuid,$2::jsonb,$3,$4,$5)",
      [staffCustomers[0].id,
        db.json([{ product_id: productId, quantity: 1 }, { product_id: otherProductId, quantity: 1 }]),
        "CI rollback test", rollbackKey, "cash_on_delivery"],
    ),
    /product is not active in the staff organization/i,
  );
  await db.unsafe("reset role");
  const rollbackCount = await db.unsafe(
    "select count(*)::int as count from public.orders where organization_id=$1 and created_by=$2 and idempotency_key=$3",
    [organizationId, staffProfileId, rollbackKey],
  );
  assert.equal(rollbackCount[0].count, 0, "late item validation failure must roll back the new order header and prior line inserts");
  const rollbackLineCount = await db.unsafe(
    "select count(*)::int as count from public.order_items oi join public.orders o on o.id=oi.order_id where o.organization_id=$1 and o.created_by=$2 and o.idempotency_key=$3",
    [organizationId, staffProfileId, rollbackKey],
  );
  assert.equal(rollbackLineCount[0].count, 0, "failed order creation must leave no persisted order lines");
  await db.unsafe("set role authenticated");
  process.stdout.write("PASS failed staff order creation rolled back all writes\\n");

  const staffOrderRows = await db.unsafe(
    "select id,total_amount from public.fetch_staff_orders() where id=$1",
    [order.id],
  );
  assert.equal(staffOrderRows.length, 1, "active staff can read orders through the scoped RPC");
  assert.equal(Number(staffOrderRows[0].total_amount), 370000, "staff RPC exposes the authoritative order total");
  const staffItemRows = await db.unsafe(
    "select id,unit_price_snapshot,line_total,approved_unit_price from public.fetch_staff_order_items($1::uuid)",
    [order.id],
  );
  assert.equal(staffItemRows.length, 1, "active staff can read order lines through the scoped RPC");
  assert.equal(Number(staffItemRows[0].unit_price_snapshot), 37000);
  assert.equal(Number(staffItemRows[0].line_total), 370000);
  await expectFailure(
    "staff RPC cross-tenant order denial",
    () => db.unsafe("select * from public.fetch_staff_order_items($1::uuid)", ["aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"]),
    /outside the active staff organization/i,
  );
  await db.unsafe("update public.orders set status='confirmed' where id=$1", [order.id]);

  const financeSnapshot = await db.unsafe("select public.fetch_staff_finance_data() as result");
  const invoice = financeSnapshot[0].result.invoices.find((row) => row.order_id === order.id);
  assert.ok(invoice, "confirming the order should issue exactly one invoice visible to authorized staff");
  assert.equal(invoice.status, "issued");
  assert.equal(Number(invoice.total_amount), 370000);
  const stockAfterConfirm = await db.unsafe(
    "select quantity_on_hand,quantity_reserved,quantity_available from public.inventory_balances where product_id=$1 and warehouse_id='d0000000-0000-0000-0000-000000000001'",
    [productId],
  );
  assert.equal(Number(stockAfterConfirm[0].quantity_reserved), 10, "confirmation should reserve inventory");
  assert.equal(Number(stockAfterConfirm[0].quantity_available), 538, "reservation must reduce available stock");

  await expectFailure(
    "overpayment",
    () => db.unsafe("select public.record_customer_payment($1::uuid,$2::numeric,$3,$4,$5)", [invoice.id, 500000, "cash", "CI-OVERPAY", "should reject"]),
    /exceeds invoice balance/i,
  );
  await db.unsafe(
    "select public.record_customer_payment($1::uuid,$2::numeric,$3,$4,$5)",
    [invoice.id, 100000, "transfer", "CI-PAY-001", "partial payment"],
  );
  const invoiceAfterPayment = await db.unsafe("select status from public.customer_invoices where id=$1", [invoice.id]);
  assert.equal(invoiceAfterPayment[0].status, "partially_paid");
  const customerBalance = await db.unsafe("select current_balance from public.customers where id=(select customer_id from public.orders where id=$1)", [order.id]);
  assert.equal(Number(customerBalance[0].current_balance), 270000, "customer balance must reflect invoice minus payment");

  // Customers receive allowed statement amounts only through the account-statement RPC.
  await db.unsafe("reset role");
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");
  const statementSnapshot = await db.unsafe("select public.get_customer_account_statement() as result");
  const statement = statementSnapshot[0].result;
  const statementInvoice = statement.invoices.find((row) => row.id === invoice.id);
  assert.ok(statementInvoice, "customer statement should include the customer's own invoice");
  assert.equal(Number(statementInvoice.total_amount), 370000, "statement RPC may expose invoice totals on the authorized account-statement surface");
  assert.equal(statement.payments.length, 1, "customer statement should include the payment ledger");
  assert.equal(Number(statement.payments[0].amount), 100000);

  // A second customer in the same organization must never receive the first customer's statement.
  await db.unsafe("reset role");
  await setIdentity(secondAuthUserId, "ci-customer-two@example.test");
  await db.unsafe("set role authenticated");
  const otherStatementResult = await db.unsafe("select public.get_customer_account_statement() as result");
  assert.deepEqual(otherStatementResult[0].result.invoices, [], "customer two must not see customer one's invoice");
  assert.deepEqual(otherStatementResult[0].result.payments, [], "customer two must not see customer one's payments");
  const otherVisibleInvoices = await db.unsafe(
    "select id,invoice_number from public.customer_invoices where id=$1",
    [invoice.id],
  );
  assert.equal(otherVisibleInvoices.length, 0, "invoice row policy must isolate customer-two reads");

  // Disabled profiles must lose even the explicit statement RPC path.
  await db.unsafe("reset role");
  await db.unsafe("update public.profiles set is_active=false where id=$1", [profileId]);
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");
  await expectFailure(
    "inactive customer statement access",
    () => db.unsafe("select public.get_customer_account_statement()"),
    /authenticated active customer required/i,
  );
  await db.unsafe("reset role");
  await db.unsafe("update public.profiles set is_active=true where id=$1", [profileId]);
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");

  const safeInvoiceRows = await db.unsafe(
    "select id,invoice_number,order_id,status,issued_at,currency from public.customer_invoices where id=$1",
    [invoice.id],
  );
  assert.equal(safeInvoiceRows.length, 1, "customer may read non-financial invoice headers");
  const safeInvoiceLines = await db.unsafe(
    "select id,invoice_id,item_code,description,unit,quantity from public.customer_invoice_items where invoice_id=$1",
    [invoice.id],
  );
  assert.equal(safeInvoiceLines.length, 1, "customer may read non-financial invoice line descriptions");
  await expectFailure(
    "customer direct invoice total access",
    () => db.unsafe("select total_amount from public.customer_invoices where id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer SELECT * on invoices",
    () => db.unsafe("select * from public.customer_invoices where id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer direct invoice line unit-price access",
    () => db.unsafe("select unit_price from public.customer_invoice_items where invoice_id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer direct invoice line total access",
    () => db.unsafe("select line_total from public.customer_invoice_items where invoice_id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer direct payment amount access",
    () => db.unsafe("select amount from public.customer_payments where invoice_id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "customer cannot call staff finance RPC",
    () => db.unsafe("select public.fetch_staff_finance_data()"),
    /finance permission required/i,
  );

  await db.unsafe("reset role");
  await setIdentity(operationsStaffAuthUserId, "ci-operations-staff@example.test");
  await db.unsafe("set role authenticated");
  await expectFailure(
    "ordinary staff cannot read finance aggregates",
    () => db.unsafe("select public.fetch_staff_finance_data()"),
    /finance permission required/i,
  );
  await expectFailure(
    "ordinary staff cannot record customer payments",
    () => db.unsafe("select public.record_customer_payment($1::uuid,$2::numeric,$3,$4,$5)", [invoice.id, 1, "cash", "CI-STAFF-PAY", "must be denied"]),
    /finance permission required/i,
  );
  await expectFailure(
    "ordinary staff cannot update invoices directly",
    () => db.unsafe("update public.customer_invoices set status='void' where id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "ordinary staff cannot update invoice lines directly",
    () => db.unsafe("update public.customer_invoice_items set quantity=99 where invoice_id=$1", [invoice.id]),
    /permission denied/i,
  );
  await expectFailure(
    "ordinary staff cannot write payment ledger directly",
    () => db.unsafe("insert into public.customer_payments(organization_id,customer_id,invoice_id,amount,payment_method,created_by) values($1,$2,$3,1,'cash',$4)", [organizationId, invoice.customer_id, invoice.id, operationsStaffProfileId]),
    /permission denied/i,
  );
  await expectFailure(
    "ordinary staff cannot assign user roles directly",
    () => db.unsafe("insert into public.user_roles(profile_id,role) values($1,'manager')", [secondProfileId]),
    /permission denied/i,
  );
  await expectFailure(
    "ordinary staff cannot edit profile tenant/auth binding",
    () => db.unsafe("update public.profiles set organization_id=$1,auth_user_id=$2 where id=$3", [otherOrganizationId, secondAuthUserId, secondProfileId]),
    /permission denied/i,
  );
  const staffCannotReadOtherProfile = await db.unsafe("select id from public.profiles where id=$1", [secondProfileId]);
  assert.equal(staffCannotReadOtherProfile.length, 0, "ordinary staff cannot enumerate customer profiles through PostgREST");
  const staffCannotReadOtherRoles = await db.unsafe("select profile_id,role from public.user_roles where profile_id=$1", [secondProfileId]);
  assert.equal(staffCannotReadOtherRoles.length, 0, "ordinary staff can read only their own role rows");
  await expectFailure(
    "ordinary staff cannot list organization role assignments",
    () => db.unsafe("select public.list_organization_user_roles()"),
    /admin role required/i,
  );
  await expectFailure(
    "ordinary staff cannot change roles through the admin RPC",
    () => db.unsafe("select public.set_organization_user_roles($1::uuid,$2::text[])", [secondProfileId, db.array(["accountant"], "text[]")]),
    /admin role required/i,
  );

  await db.unsafe("reset role");
  await setIdentity(accountantAuthUserId, "ci-accountant@example.test");
  await db.unsafe("set role authenticated");
  const accountantFinanceResult = await db.unsafe("select public.fetch_staff_finance_data() as result");
  const accountantInvoice = accountantFinanceResult[0].result.invoices.find((row) => row.id === invoice.id);
  assert.equal(Number(accountantInvoice.total_amount), 370000, "accountant may read the authorized invoice financial snapshot");
  const accountantPayment = accountantFinanceResult[0].result.payments.find((row) => row.invoice_id === invoice.id);
  assert.equal(Number(accountantPayment.amount), 100000, "accountant may read authorized customer payments");
  await expectFailure(
    "accountant cannot access operational staff order RPC",
    () => db.unsafe("select * from public.fetch_staff_orders()"),
    /staff role required for order access/i,
  );
  await expectFailure(
    "accountant payment command still validates invoice balance",
    () => db.unsafe("select public.record_customer_payment($1::uuid,$2::numeric,$3,$4,$5)", [invoice.id, 500000, "cash", "CI-ACCOUNTANT-OVERPAY", "must fail balance check"]),
    /payment exceeds invoice balance/i,
  );

  await db.unsafe("reset role");
  await setIdentity(staffAuthUserId, "admin@aghbari.ye");
  await db.unsafe("set role authenticated");
  const listedUsers = await db.unsafe("select public.list_organization_user_roles() as result");
  const listedRows = listedUsers[0].result;
  assert.ok(listedRows.some((row) => row.profile_id === accountantProfileId && row.roles.includes("accountant")),
    "admin may list accountant accounts within the organization");
  assert.ok(!listedRows.some((row) => row.profile_id === foreignProfileId),
    "admin user listing must not include another organization's profiles");
  await expectFailure(
    "administrator cannot change their own roles through role-management RPC",
    () => db.unsafe("select public.set_organization_user_roles($1::uuid,$2::text[])", [staffProfileId, db.array(["staff"], "text[]")]),
    /cannot change their own roles/i,
  );
  await expectFailure(
    "administrator cannot assign a role outside the organization",
    () => db.unsafe("select public.set_organization_user_roles($1::uuid,$2::text[])", [foreignProfileId, db.array(["accountant"], "text[]")]),
    /outside the current organization/i,
  );
  await expectFailure(
    "customer role cannot be combined with operational/accountant roles",
    () => db.unsafe("select public.set_organization_user_roles($1::uuid,$2::text[])", [secondProfileId, db.array(["customer","accountant"], "text[]")]),
    /customer role cannot be combined/i,
  );
  const assignedAccountant = await db.unsafe(
    "select public.set_organization_user_roles($1::uuid,$2::text[]) as result",
    [operationsStaffProfileId, db.array(["accountant"], "text[]")],
  );
  assert.deepEqual(assignedAccountant[0].result.roles.sort(), ["accountant"],
    "admin can assign the accountant finance-only role");
  const auditedRoleChange = await db.unsafe(
    "select action from public.audit_logs where organization_id=$1 and actor_id=$2 and entity_type='profile' and entity_id=$3",
    [organizationId, staffProfileId, operationsStaffProfileId],
  );
  assert.ok(auditedRoleChange.some((row) => row.action === "user.roles.changed"), "role assignment must be audited");
  const restoredOperationsRole = await db.unsafe(
    "select public.set_organization_user_roles($1::uuid,$2::text[]) as result",
    [operationsStaffProfileId, db.array(["staff"], "text[]")],
  );
  assert.deepEqual(restoredOperationsRole[0].result.roles.sort(), ["staff"],
    "admin can restore the operations role after the role assignment test");
  const authorizedFinance = await db.unsafe("select public.fetch_staff_finance_data() as result");
  const staffInvoice = authorizedFinance[0].result.invoices.find((row) => row.id === invoice.id);
  const staffPayment = authorizedFinance[0].result.payments.find((row) => row.invoice_id === invoice.id);
  assert.equal(Number(staffInvoice.total_amount), 370000, "staff finance RPC retains invoice totals");
  assert.equal(Number(staffPayment.amount), 100000, "staff finance RPC retains payment amounts");

  await db.unsafe("update public.orders set status='processing' where id=$1", [order.id]);
  await db.unsafe("update public.orders set status='shipped' where id=$1", [order.id]);
  const stockAfterShipment = await db.unsafe(
    "select quantity_on_hand,quantity_reserved,quantity_available from public.inventory_balances where product_id=$1 and warehouse_id='d0000000-0000-0000-0000-000000000001'",
    [productId],
  );
  assert.equal(Number(stockAfterShipment[0].quantity_on_hand), 538, "shipping should consume on-hand stock");
  assert.equal(Number(stockAfterShipment[0].quantity_reserved), 0, "shipping should clear the stock reservation");
  await expectFailure(
    "cancelling a shipped order",
    () => db.unsafe("update public.orders set status='cancelled' where id=$1", [order.id]),
    /shipped order cannot be cancelled|shipped.*cannot be cancelled/i,
  );
  await db.unsafe("update public.orders set status='delivered' where id=$1", [order.id]);
  const saleMovements = await db.unsafe(
    "select count(*)::int as count from public.inventory_movements where reference_type='order' and reference_id=$1 and movement_type='sale'",
    [order.id],
  );
  assert.equal(saleMovements[0].count, 1, "delivery must not consume the same stock twice");

  await db.unsafe("reset role");
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");
  const reviewOrderResult = await db.unsafe(
    "select public.submit_customer_order($1::jsonb,$2,$3,$4,$5,$6,$7) as result",
    [db.json([{ product_id: productId, quantity: 2 }]), "CI review workflow", "CI Company One", "CI Customer One",
      "7771111111", "credit", "ci-review-order-000001"],
  );
  const reviewOrder = reviewOrderResult[0].result;
  const reviewItemRows = await db.unsafe(
    "select id,quantity from public.order_items where order_id=$1",
    [reviewOrder.id],
  );
  assert.equal(reviewItemRows.length, 1, "customer may read the non-financial review line identity");
  assert.equal(Number(reviewItemRows[0].quantity), 2);

  // Switch to staff identity before reading any financial line fields.
  await db.unsafe("reset role");
  await setIdentity(staffAuthUserId, "admin@aghbari.ye");
  await db.unsafe("set role authenticated");
  const staffReviewItems = await db.unsafe(
    "select id,quantity,unit_price_snapshot from public.fetch_staff_order_items($1::uuid)",
    [reviewOrder.id],
  );
  assert.equal(staffReviewItems.length, 1, "staff must get review lines from the tenant-scoped RPC");
  assert.equal(Number(staffReviewItems[0].unit_price_snapshot), 38500, "the original quantity-two line snapshot must remain intact before the one-order override");
  const reviewLines = [{
    item_id: reviewItemRows[0].id,
    quantity: 1,
    unit_price: 36000,
    price_reason: "CI one-order override; not a catalog price change",
  }];
  const stagedReview = await db.unsafe(
    "select public.review_order_lines($1::uuid,$2::jsonb,$3,$4) as result",
    [reviewOrder.id, db.json(reviewLines), "stage", "CI order review"],
  );
  assert.equal(stagedReview[0].result.quantity_review_required, true, "changed quantities must be marked unapproved");
  await expectFailure(
    "direct confirmation with unapproved order proposals",
    () => db.unsafe("update public.orders set status='confirmed' where id=$1", [reviewOrder.id]),
    /اعتماد كل الكميات والأسعار|unapproved|approval/i,
  );
  const approvedReview = await db.unsafe(
    "select public.review_order_lines($1::uuid,$2::jsonb,$3,$4) as result",
    [reviewOrder.id, db.json(reviewLines), "approve", "CI order review"],
  );
  assert.equal(approvedReview[0].result.status, "confirmed", "approved review must confirm the order");
  assert.equal(Number(approvedReview[0].result.total_amount), 36000, "order total must be recalculated from approved price and quantity");
  const reviewedState = await db.unsafe(
    "select status,total_amount,quantity_review_required,payment_request_status,customer_payment_requested_at from public.fetch_staff_orders() where id=$1",
    [reviewOrder.id],
  );
  assert.equal(reviewedState[0].status, "confirmed");
  assert.equal(Number(reviewedState[0].total_amount), 36000);
  assert.equal(reviewedState[0].quantity_review_required, false);
  assert.equal(reviewedState[0].payment_request_status, "requested");
  assert.ok(reviewedState[0].customer_payment_requested_at, "customer payment request should be recorded at confirmation");
  const reviewedLines = await db.unsafe(
    "select quantity,requested_quantity,approved_quantity,unit_price_snapshot,approved_unit_price,price_override_reason from public.fetch_staff_order_items($1::uuid)",
    [reviewOrder.id],
  );
  assert.equal(Number(reviewedLines[0].requested_quantity), 2, "original requested quantity must remain auditable");
  assert.equal(Number(reviewedLines[0].approved_quantity), 1);
  assert.equal(Number(reviewedLines[0].quantity), 1);
  assert.equal(Number(reviewedLines[0].approved_unit_price), 36000);
  assert.match(reviewedLines[0].price_override_reason, /CI one-order override/);
  const reviewedFinance = await db.unsafe("select public.fetch_staff_finance_data() as result");
  const reviewedInvoice = reviewedFinance[0].result.invoices.filter((row) => row.order_id === reviewOrder.id);
  assert.equal(reviewedInvoice.length, 1, "approval should issue exactly one invoice");
  assert.equal(Number(reviewedInvoice[0].total_amount), 36000);
  process.stdout.write("PASS order-review approval, stale/unapproved confirmation guard, one-order price override, invoice and payment-request lifecycle\\n");

  const importCreated = await db.unsafe(
    "select public.create_import_job($1,$2,$3,$4,null,$5,$6) as result",
    ["CI Onyx stock.csv", "a".repeat(64), 500, "onyx_stock", "2026-01", "ci"],
  );
  const importJob = importCreated[0].result;
  assert.equal(importJob.organization_id, organizationId, "import tenant must be derived from authenticated staff");
  assert.ok(importJob.profile_id, "import should attach a versioned profile");
  assert.equal(importJob.raw_file_retained, false, "raw files must not be retained");

  const importRows = [
    { item_code: "000125", product_name: "Rice", quantity: "5", revenue: "150", date: "2026-01-01" },
    { item_code: "000126", product_name: "Sugar", quantity: "10", revenue: "450", date: "2026-01-02" },
  ];
  await db.unsafe(
    "insert into public.import_job_rows(import_job_id,row_number,status,data,errors) values($1,1,'valid',$2::jsonb,'[]'::jsonb),($1,2,'valid',$3::jsonb,'[]'::jsonb)",
    [importJob.id, db.json(importRows[0]), db.json(importRows[1])],
  );

  const importProfile = await db.unsafe(
    "select public.create_central_synonym($1,$2,$3,$4) as result",
    ["رمز الصنف CI", "item_code", importJob.profile_id, "ar"],
  );
  assert.equal(importProfile[0].result.canonical_field, "item_code", "central synonym should persist via tenant-bound RPC");

  const importSession = await db.unsafe("select public.create_import_upload_session($1::uuid) as result", [importJob.id]);
  assert.equal(importSession[0].result.total_chunks, 1, "a small source file should create one upload manifest chunk");
  const chunkHash = "c".repeat(64);
  const recordedChunk = await db.unsafe(
    "select public.record_import_upload_chunk($1::uuid,$2,$3,$4,$5) as result",
    [importSession[0].result.id, 0, 0, 500, chunkHash],
  );
  assert.equal(recordedChunk[0].result.complete, true, "all verified chunk metadata should complete the upload manifest");
  const repeatedChunk = await db.unsafe(
    "select public.record_import_upload_chunk($1::uuid,$2,$3,$4,$5) as result",
    [importSession[0].result.id, 0, 0, 500, chunkHash],
  );
  assert.equal(repeatedChunk[0].result.verified_chunks, 1, "identical chunk retry must not duplicate manifest rows");
  await expectFailure(
    "upload chunk with mismatching digest under same sequence number",
    () => db.unsafe(
      "select public.record_import_upload_chunk($1::uuid,$2,$3,$4,$5)",
      [importSession[0].result.id, 0, 0, 500, "d".repeat(64)],
    ),
    /تعارض|chunk|شريحة/i,
  );

  const duplicateProbe = await db.unsafe(
    "select public.find_import_duplicate($1,$2::uuid,$3) as result",
    ["a".repeat(64), importJob.profile_id, "2026-01"],
  );
  assert.equal(duplicateProbe[0].result.duplicate, true, "same tenant/profile/hash/period must be reported as a duplicate");

  const finalizedImport = await db.unsafe(
    "select public.finalize_import_job($1::uuid,$2) as result",
    [importJob.id, "new_version"],
  );
  assert.equal(finalizedImport[0].result.status, "completed", "high-quality structured import should be accepted");
  assert.equal(Number(finalizedImport[0].result.data_quality_score), 100);
  assert.ok(finalizedImport[0].result.snapshot_id, "accepted import should create an immutable Onyx snapshot");
  const onyxAnalytics = await db.unsafe(
    "select public.get_onyx_snapshot_analytics($1::uuid) as result",
    [finalizedImport[0].result.snapshot_id],
  );
  assert.equal(Number(onyxAnalytics[0].result.metrics.row_count), 2, "server analytics should read the complete snapshot");
  assert.equal(Number(onyxAnalytics[0].result.metrics.unique_keys), 2);
  assert.equal(Number(onyxAnalytics[0].result.metrics.quantity_total), 15, "quantity KPI must include every snapshot row");
  assert.equal(Number(onyxAnalytics[0].result.metrics.revenue_total), 600, "revenue KPI must include every snapshot row");
  assert.equal(onyxAnalytics[0].result.forecast_status, "Forecast Unavailable: Insufficient Historical Data");
  process.stdout.write("PASS import profile, tenant-scoped synonyms, resumable chunk manifest, duplicate detection, DQS finalization and full-snapshot Onyx analytics\n");

  // The rule UI must reuse the existing deterministic pricing engine and reset to base price
  // when its last applicable rule is deleted.
  const previouslyActiveRules = await db.unsafe(
    "select id from public.pricing_rules where organization_id=$1 and is_active=true",
    [organizationId],
  );
  await db.unsafe("update public.pricing_rules set is_active=false where organization_id=$1 and is_active=true", [organizationId]);
  const pricingBaseRow = await db.unsafe(
    "select base_price,retail_price,wholesale_price from public.products where id=$1 and organization_id=$2",
    [productId, organizationId],
  );
  assert.equal(pricingBaseRow.length, 1, "pricing acceptance product should exist in the active organization");
  const pricingBase = Number(pricingBaseRow[0].base_price);
  assert.equal(Number(pricingBaseRow[0].retail_price), pricingBase, "no active rules must reset retail price to base_price");
  assert.equal(Number(pricingBaseRow[0].wholesale_price), pricingBase, "no active rules must reset wholesale price to base_price");

  const insertedRule = await db.unsafe(
    `insert into public.pricing_rules(
       organization_id,name,scope_type,scope_value,base_type,base_source,adjustment_type,
       calculation_method,adjustment_value,target_tier,min_quantity,min_price,max_price,
       priority,is_active,requires_approval,manually_locked,version
     ) values($1,'CI pricing calculation rule','product',$2,'base_price','base_price','percentage',
       'add_percentage',10,'both',1,null,null,1,true,false,false,1)
     returning id`,
    [organizationId, productId],
  );
  const pricingRuleId = insertedRule[0].id;
  let derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  const addPercentageExpected = Math.round(pricingBase * 1.1 * 100) / 100;
  assert.equal(Number(derivedPrices[0].retail_price), addPercentageExpected, "percentage addition must recalculate retail");
  assert.equal(Number(derivedPrices[0].wholesale_price), addPercentageExpected, "percentage addition must recalculate wholesale");

  await db.unsafe("update public.pricing_rules set calculation_method='margin_percentage',adjustment_type='margin',adjustment_value=25 where id=$1", [pricingRuleId]);
  derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  const marginExpected = Math.round((pricingBase / 0.75) * 100) / 100;
  assert.equal(Number(derivedPrices[0].retail_price), marginExpected, "margin percentage must calculate margin on sale price");
  assert.equal(Number(derivedPrices[0].wholesale_price), marginExpected, "margin percentage must update both selected tiers");

  await db.unsafe("update public.pricing_rules set calculation_method='fixed_price',adjustment_type='fixed',adjustment_value=123.45 where id=$1", [pricingRuleId]);
  derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  assert.equal(Number(derivedPrices[0].retail_price), 123.45, "fixed price must update retail");
  assert.equal(Number(derivedPrices[0].wholesale_price), 123.45, "fixed price must update wholesale");

  await db.unsafe("update public.pricing_rules set calculation_method='add_subtract_amount',adjustment_type='amount',adjustment_value=-12.50 where id=$1", [pricingRuleId]);
  derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  assert.equal(Number(derivedPrices[0].retail_price), pricingBase - 12.5, "negative amount must deduct from retail base");
  assert.equal(Number(derivedPrices[0].wholesale_price), pricingBase - 12.5, "negative amount must deduct from wholesale base");

  await db.unsafe("update public.pricing_rules set target_tier='wholesale',calculation_method='fixed_price',adjustment_type='fixed',adjustment_value=111.10 where id=$1", [pricingRuleId]);
  derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  assert.equal(Number(derivedPrices[0].retail_price), pricingBase, "wholesale-only rule must leave retail at base when no other rules apply");
  assert.equal(Number(derivedPrices[0].wholesale_price), 111.1, "wholesale-only rule must update wholesale");

  await db.unsafe("delete from public.pricing_rules where id=$1", [pricingRuleId]);
  derivedPrices = await db.unsafe("select retail_price,wholesale_price from public.products where id=$1", [productId]);
  assert.equal(Number(derivedPrices[0].retail_price), pricingBase, "deleting last applicable rule must reset retail exactly to base_price");
  assert.equal(Number(derivedPrices[0].wholesale_price), pricingBase, "deleting last applicable rule must reset wholesale exactly to base_price");
  const pricingAudit = await db.unsafe(
    "select action from public.audit_logs where organization_id=$1 and entity_type='pricing_rule' and entity_id=$2",
    [organizationId, pricingRuleId],
  );
  assert.ok(pricingAudit.some((row) => row.action === 'pricing_rule.created'), "rule creation must be audited");
  assert.ok(pricingAudit.filter((row) => row.action === 'pricing_rule.updated').length >= 4, "rule updates must be audited");
  assert.ok(pricingAudit.some((row) => row.action === 'pricing_rule.deleted'), "rule deletion must be audited");

  if (previouslyActiveRules.length) {
    await db.unsafe("update public.pricing_rules set is_active=true where id=any($1::uuid[])", [previouslyActiveRules.map((row) => row.id)]);
  }
  process.stdout.write("PASS pricing rules: all four formulas, tier targeting, deletion resets both derived tier prices to base, and audited mutations\n");

  process.stdout.write("PASS: migrations applied, tier price breaks, checkout idempotency, tenant isolation, quotations, reorder, invoice/payment, and stock lifecycle and pricing-rule CRUD semantics.\n");
}

try {
  await main();
} finally {
  await db.end({ timeout: 5 });
}

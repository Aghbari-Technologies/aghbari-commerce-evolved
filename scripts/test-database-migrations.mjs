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
  await db.unsafe(
    "insert into public.organizations(id,name,currency) values($1,'Foreign organization','YER') on conflict(id) do nothing",
    [otherOrganizationId],
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

  const preview10 = await db.unsafe(
    "select public.preview_order_pricing($1::jsonb) as result",
    [JSON.stringify([{ product_id: productId, quantity: 10 }])],
  );
  assert.equal(Number(preview10[0].result.total_amount), 370000, "quantity 10 should use the wholesale price break of 37,000");

  const preview20 = await db.unsafe(
    "select public.preview_order_pricing($1::jsonb) as result",
    [JSON.stringify([{ product_id: productId, quantity: 20 }])],
  );
  assert.equal(Number(preview20[0].result.total_amount), 700000, "quantity 20 should use the more favorable wholesale price break of 35,000");

  await expectFailure(
    "cross-tenant price preview",
    () => db.unsafe("select public.preview_order_pricing($1::jsonb)", [JSON.stringify([{ product_id: otherProductId, quantity: 1 }])]),
    /unavailable|organization/i,
  );

  const itemPayload = [{ product_id: productId, quantity: 10 }];
  const orderArgs = [
    JSON.stringify(itemPayload), "CI smoke order", "CI Company One", "CI Customer One",
    "7771111111", "credit", "ci-idempotency-key-000001",
  ];
  const firstOrder = await db.unsafe(
    "select public.place_order($1::jsonb,$2,$3,$4,$5,$6,$7) as result",
    orderArgs,
  );
  const order = firstOrder[0].result;
  assert.equal(Number(order.total_amount), 370000, "server order total must match tier pricing");
  assert.equal(order.idempotent_replay, false);

  const replay = await db.unsafe(
    "select public.place_order($1::jsonb,$2,$3,$4,$5,$6,$7) as result",
    orderArgs,
  );
  assert.equal(replay[0].result.id, order.id, "same idempotency key and payload must return the original order");
  assert.equal(replay[0].result.idempotent_replay, true);
  await expectFailure(
    "idempotency payload mismatch",
    () => db.unsafe(
      "select public.place_order($1::jsonb,$2,$3,$4,$5,$6,$7)",
      [JSON.stringify([{ product_id: productId, quantity: 11 }]), ...orderArgs.slice(1)],
    ),
    /different|مختلفة/i,
  );
  const orderCount = await db.unsafe(
    "select count(*)::int as count from public.orders where created_by=$1 and idempotency_key=$2",
    [profileId, "ci-idempotency-key-000001"],
  );
  assert.equal(orderCount[0].count, 1, "a replay must not create a duplicate order");

  const firstQuote = await db.unsafe(
    "select public.request_sales_quote($1::jsonb,$2) as id",
    [JSON.stringify([{ product_id: productId, quantity: 2 }]), "CI quotation"],
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
    [JSON.stringify([{ product_id: productId, quantity: 1 }]), "CI second customer RFQ"],
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
    [firstQuoteId, JSON.stringify([{ item_id: firstQuoteItems[0].id, unit_price: 12345 }]), "CI quote priced", new Date(Date.now() + 86400000).toISOString()],
  );

  await db.unsafe("reset role");
  await setIdentity(authUserId, "ci-customer-one@example.test");
  await db.unsafe("set role authenticated");
  const quoteAccept = await db.unsafe("select public.customer_respond_to_quote($1::uuid,true)", [firstQuoteId]);
  assert.ok(quoteAccept, "customer must be able to accept a quote for their account");

  const reorderId = await db.unsafe(
    "select public.save_reorder_template($1,$2::jsonb,null) as id",
    ["CI regular order", JSON.stringify([{ product_id: productId, quantity: 3 }])],
  );
  const reorderItems = await db.unsafe(
    "select count(*)::int as count from public.reorder_template_items where template_id=$1",
    [reorderId[0].id],
  );
  assert.equal(reorderItems[0].count, 1, "reorder template must persist its items");

  await db.unsafe("reset role");
  await setIdentity(staffAuthUserId, "admin@aghbari.ye");
  await db.unsafe("set role authenticated");
  await db.unsafe("update public.orders set status='confirmed' where id=$1", [order.id]);

  const invoiceRows = await db.unsafe(
    "select id,total_amount,status from public.customer_invoices where order_id=$1",
    [order.id],
  );
  assert.equal(invoiceRows.length, 1, "confirming the order should issue exactly one invoice");
  const invoice = invoiceRows[0];
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

  process.stdout.write("PASS: migrations applied, tier price breaks, checkout idempotency, tenant isolation, quotations, reorder, invoice/payment, and stock lifecycle.\n");
}

try {
  await main();
} finally {
  await db.end({ timeout: 5 });
}

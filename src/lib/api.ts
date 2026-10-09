import { supabase, ORG_ID, WAREHOUSE_ID } from './supabase';
import type {
  Product, Category, Customer, Supplier, Order, OrderItem,
  InventoryBalance, PricingRule, Promotion, AiAlert, AiTask, Notification,
  ProductWithInventory, OrderWithCustomer, AdminSetting, ImportJob, ImportJobRow,
} from './types';

// ─── Products ───
export async function fetchProducts(): Promise<ProductWithInventory[]> {
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('name');
  if (error) throw error;

  const { data: inventory, error: inventoryError } = await supabase
    .from('inventory_balances')
    .select('*')
    .eq('warehouse_id', WAREHOUSE_ID);
  if (inventoryError) throw inventoryError;

  const invMap = new Map<string, InventoryBalance>();
  inventory?.forEach((inv: InventoryBalance) => invMap.set(inv.product_id, inv));

  const { data: categories, error: categoryError } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', ORG_ID);
  if (categoryError) throw categoryError;
  const catMap = new Map<string, Category>();
  categories?.forEach((cat: Category) => catMap.set(cat.id, cat));

  return (products as Product[]).map((p) => ({
    ...p,
    inventory: invMap.get(p.id),
    category: catMap.get(p.category_id || ''),
  }));
}

export async function createProduct(p: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .insert({ ...p, organization_id: ORG_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
  const { data, error } = await supabase
    .from('products')
    .update(updates)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteProduct(id: string): Promise<void> {
  const { error } = await supabase.from('products').delete().eq('id', id);
  if (error) throw error;
}

// ─── Categories ───
export async function fetchCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('sort_order');
  if (error) throw error;
  return data as Category[];
}

export async function createCategory(c: Partial<Category>): Promise<Category> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ ...c, organization_id: ORG_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (error) throw error;
}

// ─── Customers ───
export async function fetchCustomers(): Promise<Customer[]> {
  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Customer[];
}

export async function createCustomer(c: Partial<Customer>): Promise<Customer> {
  const { data, error } = await supabase
    .from('customers')
    .insert({ ...c, organization_id: ORG_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCustomerStatus(id: string, status: string): Promise<void> {
  const { error } = await supabase
    .from('customers')
    .update({ status, approved_at: status === 'approved' ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

// ─── Suppliers ───
export async function fetchSuppliers(): Promise<Supplier[]> {
  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('name');
  if (error) throw error;
  return data as Supplier[];
}

export async function createSupplier(s: Partial<Supplier>): Promise<Supplier> {
  const { data, error } = await supabase
    .from('suppliers')
    .insert({ ...s, organization_id: ORG_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// ─── Orders ───
export async function fetchOrders(): Promise<OrderWithCustomer[]> {
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;

  const { data: customers } = await supabase
    .from('customers')
    .select('*')
    .eq('organization_id', ORG_ID);
  const custMap = new Map<string, Customer>();
  customers?.forEach((c: Customer) => custMap.set(c.id, c));

  return (orders as Order[]).map((o) => ({
    ...o,
    customer: custMap.get(o.customer_id),
  }));
}

export async function fetchOrderItems(orderId: string): Promise<OrderItem[]> {
  const { data, error } = await supabase
    .from('order_items')
    .select('*')
    .eq('order_id', orderId);
  if (error) throw error;
  return data as OrderItem[];
}

export type OrderReviewLineInput = {
  item_id: string;
  quantity: number;
  unit_price: number;
  price_reason?: string | null;
};

export async function reviewOrderLines(
  orderId: string,
  lines: OrderReviewLineInput[],
  action: 'stage' | 'approve' | 'discard',
  customerNote?: string,
): Promise<{
  order_id: string; action?: string; status?: string; total_amount?: number;
  total_items?: number; quantity_review_required: boolean; adjusted?: boolean;
  changed_lines?: number; payment_request_status?: string;
}> {
  const { data, error } = await supabase.rpc('review_order_lines', {
    p_order_id: orderId,
    p_lines: lines,
    p_action: action,
    p_customer_note: customerNote?.trim() || null,
  });
  if (error) throw error;
  return data as {
    order_id: string; action?: string; status?: string; total_amount?: number;
    total_items?: number; quantity_review_required: boolean; adjusted?: boolean;
    changed_lines?: number; payment_request_status?: string;
  };
}

export async function updateOrderStatus(id: string, status: string): Promise<void> {
  // The database transition trigger validates the state change and writes status history atomically.
  const { error } = await supabase.from('orders').update({ status }).eq('id', id);
  if (error) throw error;
}

export async function createOrder(order: {
  customer_id: string;
  items: { product_id: string; item_code: string; product_name: string; unit: string; quantity: number; unit_price: number }[];
  notes?: string;
}): Promise<Order> {
  const totalAmount = order.items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

  const { data: newOrder, error: orderError } = await supabase
    .from('orders')
    .insert({
      organization_id: ORG_ID,
      customer_id: order.customer_id,
      order_number: orderNumber,
      status: 'pending',
      total_amount: totalAmount,
      total_items: order.items.length,
      notes: order.notes ?? null,
    })
    .select()
    .single();
  if (orderError) throw orderError;

  const orderItems = order.items.map((item) => ({
    order_id: newOrder.id,
    product_id: item.product_id,
    item_code: item.item_code,
    product_name_snapshot: item.product_name,
    unit_snapshot: item.unit,
    quantity: item.quantity,
    unit_price_snapshot: item.unit_price,
    line_total: item.unit_price * item.quantity,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) throw itemsError;

  return newOrder;
}

// ─── Pricing rules ───
export async function fetchPricingRules(): Promise<PricingRule[]> {
  const { data, error } = await supabase
    .from('pricing_rules')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('priority');
  if (error) throw error;
  return data as PricingRule[];
}

export async function togglePricingRule(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('pricing_rules').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// ─── Promotions ───
export async function fetchPromotions(): Promise<Promotion[]> {
  const { data, error } = await supabase
    .from('promotions')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Promotion[];
}

export async function togglePromotion(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase.from('promotions').update({ is_active: isActive }).eq('id', id);
  if (error) throw error;
}

// ─── AI Alerts ───
export async function fetchAiAlerts(): Promise<AiAlert[]> {
  const { data, error } = await supabase
    .from('ai_alerts')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return data as AiAlert[];
}

export async function resolveAiAlert(id: string): Promise<void> {
  const { error } = await supabase.from('ai_alerts').update({ is_resolved: true }).eq('id', id);
  if (error) throw error;
}

// ─── AI Tasks ───
export async function fetchAiTasks(): Promise<AiTask[]> {
  const { data, error } = await supabase
    .from('ai_tasks')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as AiTask[];
}

export async function toggleAiTaskStatus(id: string, status: string): Promise<void> {
  const updates: Record<string, unknown> = { status };
  if (status === 'completed') updates.completed_at = new Date().toISOString();
  const { error } = await supabase.from('ai_tasks').update(updates).eq('id', id);
  if (error) throw error;
}

// ─── Notifications ───
export async function fetchNotifications(): Promise<Notification[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('organization_id', ORG_ID)
    .order('created_at', { ascending: false })
    .limit(30);
  if (error) throw error;
  return data as Notification[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('organization_id', ORG_ID)
    .eq('is_read', false);
  if (error) throw error;
}

// ─── Admin Settings ───
export async function fetchSettings(): Promise<AdminSetting[]> {
  const { data, error } = await supabase
    .from('admin_settings')
    .select('*')
    .eq('organization_id', ORG_ID);
  if (error) throw error;
  return data as AdminSetting[];
}

export async function updateSetting(key: string, value: unknown, category: string): Promise<void> {
  const { error } = await supabase
    .from('admin_settings')
    .upsert(
      { organization_id: ORG_ID, key, value, category, updated_at: new Date().toISOString() },
      { onConflict: 'organization_id,key' }
    );
  if (error) throw error;
}

export async function fetchSettingsMap(): Promise<Record<string, unknown>> {
  const settings = await fetchSettings();
  const map: Record<string, unknown> = {};
  settings.forEach((s) => { map[s.key] = s.value; });
  return map;
}

// ─── Unified import engine ───
export async function createImportJob(input: {
  fileName: string;
  fileHash: string;
  fileSize: number;
  jobType: string;
  totalRows?: number;
  profileId?: string | null;
  periodKey?: string | null;
  sourceSystem?: string;
}): Promise<ImportJob> {
  // Tenant identity is derived by the database from auth.uid(); no organization_id comes from the browser.
  const { data, error } = await supabase.rpc('create_import_job', {
    p_file_name: input.fileName,
    p_file_hash: input.fileHash,
    p_file_size: input.fileSize,
    p_job_type: input.jobType,
    p_profile_id: input.profileId ?? null,
    p_period_key: input.periodKey ?? null,
    p_source_system: input.sourceSystem ?? 'manual',
  });
  if (error) throw error;
  return data as ImportJob;
}

export async function createImportUploadSession(jobId: string) {
  const { data, error } = await supabase.rpc('create_import_upload_session', { p_job_id: jobId });
  if (error) throw error;
  return data as {
    id: string; import_job_id: string; chunk_size_bytes: number; total_chunks: number;
    verified_chunks: number; status: string; file_hash: string; file_size: number;
  };
}

export async function cancelImportUploadSession(sessionId: string): Promise<void> {
  const { error } = await supabase.from('import_upload_sessions').update({ status: 'cancelled', updated_at: new Date().toISOString() }).eq('id', sessionId);
  if (error) throw error;
}

export async function recordImportUploadChunk(input: {
  sessionId: string; chunkNumber: number; byteOffset: number; byteSize: number; chunkHash: string;
}) {
  const { data, error } = await supabase.rpc('record_import_upload_chunk', {
    p_session_id: input.sessionId,
    p_chunk_number: input.chunkNumber,
    p_byte_offset: input.byteOffset,
    p_byte_size: input.byteSize,
    p_chunk_hash: input.chunkHash,
  });
  if (error) throw error;
  return data as { session_id: string; verified_chunks: number; total_chunks: number; complete: boolean };
}

export async function findImportDuplicate(fileHash: string, profileId: string | null, periodKey: string | null) {
  const { data, error } = await supabase.rpc('find_import_duplicate', {
    p_file_hash: fileHash, p_profile_id: profileId, p_period_key: periodKey,
  });
  if (error) throw error;
  return data as { duplicate: boolean; jobs: ImportJob[]; snapshots: unknown[] };
}

export async function fetchInventoryReconciliationRuns() {
  const { data, error } = await supabase.from('inventory_reconciliation_runs').select('*').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}

export async function fetchInventoryReconciliationItems(runId: string) {
  const { data, error } = await supabase.from('inventory_reconciliation_items').select('*').eq('run_id', runId).order('item_code').limit(100000);
  if (error) throw error;
  return data;
}

export async function fetchCentralSynonyms() {
  const { data, error } = await supabase.from('central_synonym_dictionary').select('*').order('normalized_header').limit(2000);
  if (error) throw error;
  return data;
}

export async function saveCentralSynonym(input: {
  sourceHeader: string; normalizedHeader?: string; canonicalField: string; profileId?: string | null; locale?: string;
}) {
  // Tenant identity and normalized key are derived server-side; the browser cannot supply organization_id.
  const { data, error } = await supabase.rpc('create_central_synonym', {
    p_source_header: input.sourceHeader.trim(),
    p_canonical_field: input.canonicalField.trim(),
    p_profile_id: input.profileId ?? null,
    p_locale: input.locale ?? 'ar',
  });
  if (error) throw error;
  return data;
}

export async function finalizeImportJob(jobId: string, duplicateAction: 'ignore' | 'replace' | 'merge' | 'new_version' = 'new_version'): Promise<{
  job_id: string; status: string; data_quality_score: number; quality: Record<string, unknown>;
  snapshot_id: string | null; review_required: boolean;
}> {
  const { data, error } = await supabase.rpc('finalize_import_job', { p_job_id: jobId, p_duplicate_action: duplicateAction });
  if (error) throw error;
  return data as {
    job_id: string; status: string; data_quality_score: number; quality: Record<string, unknown>;
    snapshot_id: string | null; review_required: boolean;
  };
}

export async function fetchImportProfiles() {
  const { data, error } = await supabase.from('import_profiles').select('*').order('profile_name').order('version', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchOnyxSnapshots() {
  const { data, error } = await supabase.from('onyx_snapshots').select('*').eq('status', 'ready').order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return data;
}

export async function fetchOnyxSnapshotRows(snapshotId: string) {
  const { data, error } = await supabase.from('onyx_snapshot_rows').select('*').eq('snapshot_id', snapshotId).order('row_number').limit(100000);
  if (error) throw error;
  return data;
}

export async function runInventoryReconciliation(snapshotId: string) {
  const { data, error } = await supabase.rpc('run_inventory_reconciliation', { p_snapshot_id: snapshotId });
  if (error) throw error;
  return data as {
    run_id: string; snapshot_id: string; source_row_count: number; matched_count: number;
    changed_count: number; new_count: number; invalid_count: number;
  };
}

export async function insertImportRows(jobId: string, rows: Array<{ rowNumber: number; data: Record<string, unknown>; status: string; errors?: string[] }>): Promise<void> {
  const { error } = await supabase.from('import_job_rows').upsert(rows.map((row) => ({
    import_job_id: jobId,
    row_number: row.rowNumber,
    data: row.data,
    status: row.status,
    errors: row.errors ?? null,
  })), { onConflict: 'import_job_id,row_number' });
  if (error) throw error;
}

export async function updateImportJob(id: string, updates: Partial<ImportJob>): Promise<void> {
  const { error } = await supabase.from('import_jobs').update(updates).eq('id', id);
  if (error) throw error;
}

export async function fetchImportJobs(): Promise<ImportJob[]> {
  // Tenant-scoped RLS filters rows from the authenticated profile, not a browser-provided org ID.
  const { data, error } = await supabase.from('import_jobs').select('*').order('created_at', { ascending: false }).limit(30);
  if (error) throw error;
  return data as ImportJob[];
}

export async function fetchImportRows(jobId: string): Promise<ImportJobRow[]> {
  const { data, error } = await supabase.from('import_job_rows').select('*').eq('import_job_id', jobId).order('row_number').limit(100000);
  if (error) throw error;
  return data as ImportJobRow[];
}

// ─── Dashboard stats ───
export async function fetchDashboardStats() {
  const [products, customers, orders, alerts, lowStock] = await Promise.all([
    supabase.from('products').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('status', 'active'),
    supabase.from('customers').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID),
    supabase.from('orders').select('id, status, total_amount', { count: 'exact' }).eq('organization_id', ORG_ID),
    supabase.from('ai_alerts').select('id', { count: 'exact', head: true }).eq('organization_id', ORG_ID).eq('is_resolved', false),
    supabase.from('inventory_balances').select('quantity_on_hand, reorder_point, product_id').eq('warehouse_id', WAREHOUSE_ID),
  ]);

  const lowStockCount = (lowStock.data || []).filter(
    (inv: { quantity_on_hand: number; reorder_point: number }) => inv.quantity_on_hand <= inv.reorder_point
  ).length;

  const ordersData = orders.data || [];
  const totalSales = ordersData.reduce((sum: number, o: { total_amount: number }) => sum + (o.total_amount || 0), 0);
  const processingCount = ordersData.filter((o: { status: string }) => o.status === 'processing' || o.status === 'pending').length;

  return {
    productCount: products.count || 0,
    customerCount: customers.count || 0,
    orderCount: orders.count || 0,
    totalSales,
    processingCount,
    alertCount: alerts.count || 0,
    lowStockCount,
  };
}

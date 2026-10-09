export type Product = {
  id: string;
  name: string;
  item_code: string;
  barcode: string | null;
  description: string | null;
  unit: string;
  base_price: number;
  cost_price: number | null;
  min_stock: number;
  status: string;
  category_id: string | null;
  image_url: string | null;
  created_at: string;
  retail_price?: number;
  wholesale_price?: number;
  search_name_norm?: string;
  normalization_version?: number;
};

export type Category = {
  id: string;
  name: string;
  code: string | null;
  parent_id: string | null;
  sort_order: number;
  is_active: boolean;
};

export type Customer = {
  id: string;
  customer_code: string;
  business_name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  tier: string;
  credit_limit: number;
  current_balance: number;
  status: string;
  created_at: string;
};

export type Supplier = {
  id: string;
  supplier_code: string;
  name: string;
  contact_name: string | null;
  phone: string | null;
  email: string | null;
  status: string;
};

export type Order = {
  id: string;
  order_number: string;
  customer_id: string;
  status: string;
  total_amount: number;
  total_items: number;
  notes: string | null;
  created_at: string;
  quantity_review_required?: boolean;
  customer_adjustment_note?: string | null;
  customer_payment_requested_at?: string | null;
  customer_confirmed_at?: string | null;
  admin_adjusted_at?: string | null;
  payment_request_status?: 'not_requested' | 'requested' | 'reported' | 'verified' | 'cancelled';
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  item_code: string;
  product_name_snapshot: string;
  unit_snapshot: string | null;
  quantity: number;
  unit_price_snapshot: number;
  line_total: number;
  requested_quantity?: number;
  approved_quantity?: number;
  approved_unit_price?: number;
  price_override_reason?: string | null;
  adjusted_by?: string | null;
  adjusted_at?: string | null;
  proposed_quantity?: number | null;
  proposed_unit_price?: number | null;
  proposed_price_reason?: string | null;
};

export type InventoryBalance = {
  id: string;
  product_id: string;
  warehouse_id: string;
  quantity_on_hand: number;
  quantity_reserved: number;
  quantity_available: number;
  reorder_point: number;
};

export type PricingRule = {
  id: string;
  organization_id?: string;
  name: string;
  scope_type: string;
  scope_value?: string | null;
  base_type?: string;
  base_source?: 'base_price' | 'cost_price' | string;
  adjustment_type: string;
  adjustment_value: number;
  calculation_method?: 'add_percentage' | 'margin_percentage' | 'fixed_price' | 'add_subtract_amount' | string;
  target_tier?: 'both' | 'wholesale' | 'retail' | string;
  min_quantity?: number;
  min_price?: number | null;
  max_price?: number | null;
  requires_approval?: boolean;
  manually_locked?: boolean;
  effective_from?: string | null;
  effective_until?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  approval_note?: string | null;
  submitted_by?: string | null;
  version?: number;
  is_active: boolean;
  priority: number;
  created_at?: string;
  updated_at?: string;
};

export type CreatePricingRuleInput = {
  name: string;
  scope_type: 'default' | 'all' | 'product' | 'category';
  scope_value: string | null;
  target_tier: 'both' | 'wholesale' | 'retail';
  calculation_method: 'add_percentage' | 'margin_percentage' | 'fixed_price' | 'add_subtract_amount';
  base_source: 'base_price' | 'cost_price';
  adjustment_value: number;
  min_quantity: number;
  min_price: number | null;
  max_price: number | null;
  priority: number;
  effective_from: string | null;
  effective_until: string | null;
};

export type Promotion = {
  id: string;
  title: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
};

export type AiAlert = {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  body: string | null;
  entity_type: string | null;
  entity_id: string | null;
  is_resolved: boolean;
  created_at: string;
};

export type AiTask = {
  id: string;
  title: string;
  description: string | null;
  task_type: string | null;
  priority: string;
  status: string;
  created_at: string;
  completed_at: string | null;
};

export type Notification = {
  id: string;
  title: string;
  body: string | null;
  type: string;
  is_read: boolean;
  created_at: string;
};

export type AdminSetting = {
  id: string;
  organization_id: string;
  key: string;
  value: unknown;
  category: string;
  updated_at: string;
};

export type ImportJob = {
  id: string;
  organization_id: string;
  job_type: string;
  file_name: string | null;
  file_hash: string | null;
  file_size: number | null;
  status: string;
  total_rows: number;
  processed_rows: number;
  success_rows: number;
  failed_rows: number;
  data_quality_score: number | null;
  error_summary: Record<string, unknown> | null;
  created_at: string;
  completed_at: string | null;
  profile_id?: string | null;
  upload_session_id?: string | null;
  profile_version?: number | null;
  period_key?: string | null;
  source_system?: string;
  quality_breakdown?: Record<string, number>;
  review_required?: boolean;
  merge_strategy?: string;
  retention_expires_at?: string | null;
  purge_status?: string;
  raw_file_retained?: boolean;
  total_chunks?: number;
  processed_chunks?: number;
};

export type ImportProfile = {
  id: string;
  organization_id: string;
  profile_name: string;
  report_type: string;
  source: string;
  version: number;
  required_columns: string[];
  optional_columns: string[];
  ignored_columns: string[];
  synonyms: Record<string, string>;
  transformation_rules: unknown[];
  validation_rules: unknown[];
  matching_key: string;
  merge_strategy: string;
  date_rules: Record<string, unknown>;
  is_full_dataset: boolean;
  status: 'draft' | 'active' | 'archived';
  created_at: string;
  updated_at: string;
};

export type OnyxSnapshot = {
  id: string;
  organization_id: string;
  source_import_job_id: string;
  profile_id: string | null;
  profile_version: number | null;
  snapshot_version: number;
  source_file_hash: string;
  source_file_name: string | null;
  report_type: string;
  row_count: number;
  data_quality_score: number;
  quality_breakdown: Record<string, number>;
  normalization_version: number;
  metrics: Record<string, unknown>;
  status: string;
  created_at: string;
};

export type OnyxSnapshotRow = {
  id: string;
  snapshot_id: string;
  row_number: number;
  canonical_key: string | null;
  row_hash: string;
  status: string;
  data: Record<string, unknown>;
  errors: string[];
};

export type ImportJobRow = {
  id: string;
  import_job_id: string;
  row_number: number;
  status: string;
  data: Record<string, unknown> | null;
  errors: string[] | null;
  created_at: string;
};

export type ProductWithInventory = Product & {
  inventory?: InventoryBalance;
  category?: Category;
};

export type OrderWithCustomer = Order & {
  customer?: Customer;
};

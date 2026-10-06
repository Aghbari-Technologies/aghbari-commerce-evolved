// Re-exports the Lovable Cloud client with a loose schema type so the existing
// data layer (src/lib/api.ts) keeps its own hand-written contracts in src/lib/types.ts.
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase as typedClient } from '@/integrations/supabase/client';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = typedClient as unknown as SupabaseClient<any>;

export const ORG_ID = 'a0000000-0000-0000-0000-000000000001';
export const ADMIN_PROFILE_ID = 'f0000000-0000-0000-0000-000000000001';
export const WAREHOUSE_ID = 'd0000000-0000-0000-0000-000000000001';

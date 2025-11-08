import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0';

interface LogSyncParams {
  userId: string;
  syncType: string;
  provider?: string;
  status: 'success' | 'error';
  itemsAdded?: number;
  itemsUpdated?: number;
  errorMessage?: string;
  executionTimeMs?: number;
  metadata?: Record<string, any>;
}

export async function logSyncOperation(params: LogSyncParams) {
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { error } = await supabase.from('sync_logs').insert({
      user_id: params.userId,
      sync_type: params.syncType,
      provider: params.provider,
      status: params.status,
      items_added: params.itemsAdded || 0,
      items_updated: params.itemsUpdated || 0,
      error_message: params.errorMessage,
      execution_time_ms: params.executionTimeMs,
      metadata: params.metadata || {},
    });

    if (error) {
      console.error('[Sync Logger] Failed to log sync operation:', error);
    } else {
      console.log('[Sync Logger] Logged sync operation:', params.syncType);
    }
  } catch (err) {
    console.error('[Sync Logger] Exception logging sync operation:', err);
  }
}

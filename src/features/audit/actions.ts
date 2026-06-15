'use server'

import { createClient } from '@/lib/supabase/server'
import { getAuditLogs } from '@/services/audit'

export async function fetchAuditLogs(options?: { module?: string; profileId?: string; limit?: number }) {
  const supabase = await createClient()
  return getAuditLogs(supabase, options)
}

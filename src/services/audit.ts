import type { SupabaseClient } from '@supabase/supabase-js'

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    profile_id: string
    action: string
    module: string
    description?: string
    metadata?: Record<string, any>
  }
) {
  const { error } = await supabase.from('audit_logs').insert({
    profile_id: params.profile_id,
    action: params.action,
    module: params.module,
    description: params.description ?? null,
    metadata: params.metadata ?? {},
  })

  if (error) console.error('audit log error:', error)
}

export async function getAuditLogs(
  supabase: SupabaseClient,
  options?: {
    module?: string
    profileId?: string
    limit?: number
  }
) {
  let query = supabase
    .from('audit_logs')
    .select('*, profiles(full_name, email, avatar_url)')
    .order('created_at', { ascending: false })

  if (options?.module) {
    query = query.eq('module', options.module)
  }

  if (options?.profileId) {
    query = query.eq('profile_id', options.profileId)
  }

  if (options?.limit) {
    query = query.limit(options.limit)
  }

  const { data, error } = await query
  if (error) console.error(error)
  return (data ?? []) as any[]
}

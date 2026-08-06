import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { AccessToken } from 'npm:livekit-server-sdk@2.17.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async request => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  if (!authorization?.startsWith('Bearer ')) return json({ error: 'Missing authorization' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: authorization } } },
  )
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) return json({ error: 'Invalid session' }, 401)

  const { roomName } = await request.json().catch(() => ({}))
  if (!roomName || typeof roomName !== 'string') return json({ error: 'roomName is required' }, 400)

  const { data: room, error: roomError } = await supabase
    .from('call_rooms')
    .select('id, room_name, title, status')
    .eq('room_name', roomName)
    .maybeSingle()

  if (roomError || !room || room.status !== 'active') return json({ error: 'Call room not available' }, 403)

  const { data: profile } = await supabase.from('profiles').select('display_name, full_name, role').eq('id', user.id).maybeSingle()
  const displayName = profile?.display_name || profile?.full_name || user.email || user.id
  const isCoach = profile?.role === 'coach'
  const apiKey = Deno.env.get('LIVEKIT_API_KEY')
  const apiSecret = Deno.env.get('LIVEKIT_API_SECRET')
  const livekitUrl = Deno.env.get('LIVEKIT_URL')

  if (!apiKey || !apiSecret || !livekitUrl) return json({ error: 'LiveKit is not configured' }, 503)

  const token = new AccessToken(apiKey, apiSecret, {
    identity: user.id,
    name: displayName,
    ttl: '2h',
  })
  token.addGrant({
    room: room.room_name,
    roomJoin: true,
    canSubscribe: true,
    canPublish: true,
    canPublishData: true,
    roomAdmin: isCoach,
  })

  return json({ token: await token.toJwt(), url: livekitUrl, room: room.room_name })
})

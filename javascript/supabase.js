const SUPABASE_URL = 'https://qbyvzxouutytpmldfuyo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_z8ZCgirXFV7l_xquuHS44Q_4Kw_H9wY';

let sb = null;

function initSupabase() {
  if (sb) return sb;
  if (typeof supabase === 'undefined') return null;
  sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true },
  });
  return sb;
}

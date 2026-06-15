import { createClient } from '@supabase/supabase-js';

const url = 'https://qbyvzxouutytpmldfuyo.supabase.co';
const anonKey = 'SB_PUBLIC_KEY_PLACEHOLDER';
const serviceKey = 'SB_SERVICE_KEY_PLACEHOLDER';

const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

try {
  // Try to sign up a test user to see if Auth works
  const { data, error } = await supabase.auth.signUp({
    email: 'test@qu4sar.gg',
    password: 'Test123456!',
  });
  console.log('Auth signUp result:', JSON.stringify({ data, error }, null, 2));
} catch (e) {
  console.log('Auth error:', e.message);
}

// Try with service role
const supabaseAdmin = createClient(url, serviceKey, { auth: { persistSession: false } });

try {
  const { data, error } = await supabaseAdmin.from('profiles').select('*').limit(1);
  console.log('\nService role query result:', JSON.stringify({ data, error }, null, 2));
} catch (e) {
  console.log('\nService role query error:', e.message);
}

// Try direct fetch
try {
  const res = await fetch(`${url}/rest/v1/`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${anonKey}` }
  });
  console.log('\nDirect fetch status:', res.status, await res.text().catch(() => ''));
} catch (e) {
  console.log('\nDirect fetch error:', e.message);
}

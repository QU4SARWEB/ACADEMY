import { createClient } from '@supabase/supabase-js';

const url = 'https://qbyvzxouutytpmldfuyo.supabase.co';
const serviceKey = 'SB_SERVICE_KEY_PLACEHOLDER';

// Try using the service role key with auth admin
const supabase = createClient(url, serviceKey, { 
  auth: { persistSession: false },
  db: { schema: 'public' }
});

// Try to list users (admin endpoint)
try {
  const { data, error } = await supabase.auth.admin.listUsers();
  console.log('Admin list users:', error ? JSON.stringify(error, null, 2) : 'OK ' + data.users.length + ' users');
} catch(e) {
  console.log('Admin error:', e.message);
}

// Try a simple health check on the auth endpoint
try {
  const res = await fetch(`${url}/auth/v1/settings`, {
    headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` }
  });
  console.log('\nAuth settings status:', res.status);
  const text = await res.text();
  if (text) console.log(text.slice(0, 200));
} catch(e) {
  console.log('\nAuth settings fetch error:', e.message);
}

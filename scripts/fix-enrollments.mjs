const PAT = 'sbp_fb9b9a361dae61429a02bfb39c519f8776152685';
const PROJECT_REF = 'qbyvzxouutytpmldfuyo';

const sql = `ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`;

const res = await fetch(
  `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
  {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${PAT}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  }
);

if (!res.ok) {
  const err = await res.text();
  console.error('ERROR:', err.substring(0, 300));
} else {
  console.log('OK: enrollments.created_at added');
}

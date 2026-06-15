import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PAT = 'sbp_fb9b9a361dae61429a02bfb39c519f8776152685';
const PROJECT_REF = 'qbyvzxouutytpmldfuyo';

const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_profiles.sql');
const sql = readFileSync(sqlPath, 'utf8');

// Split into individual statements
const statements = sql
  .split(';')
  .map(s => s.trim())
  .filter(s => s.length > 0 && !s.startsWith('--'));

console.log(`Found ${statements.length} SQL statements to execute.\n`);

for (let i = 0; i < statements.length; i++) {
  const stmt = statements[i];
  const preview = stmt.split('\n')[0].substring(0, 80);
  console.log(`[${i + 1}/${statements.length}] ${preview}...`);

  const res = await fetch(
    `https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${PAT}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: stmt + ';' }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error(`  ERROR: ${err.substring(0, 200)}`);
    // Continue anyway for CREATE IF NOT EXISTS
  } else {
    console.log('  OK');
  }
}

console.log('\nDone!');

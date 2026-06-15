import { readFileSync } from 'fs';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_profiles.sql');
const sql = readFileSync(sqlPath, 'utf8');

const dbPass = '9f287e30-681e-4e4e-bf49-14ca42935eab';

// Try IPv6 address directly
const configs = [
  { host: '2600:1f16:1482:9401:5b5d:e8e2:e7eb:c983', ssl: false, description: 'IPv6 direct' },
  { host: 'db.qbyvzxouutytpmldfuyo.supabase.co', ssl: { rejectUnauthorized: false }, description: 'Hostname with SSL' },
  { host: 'db.qbyvzxouutytpmldfuyo.supabase.co', ssl: false, description: 'Hostname no SSL' },
];

for (const cfg of configs) {
  console.log(`Trying: ${cfg.description} (${cfg.host})`);
  const pool = new pg.Pool({
    host: cfg.host,
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: dbPass,
    ssl: cfg.ssl,
    connectionTimeoutMillis: 5000,
  });
  try {
    const client = await pool.connect();
    console.log('Connected!\n');
    await client.query(sql);
    console.log('Migrations executed successfully!');
    client.release();
    await pool.end();
    process.exit(0);
  } catch (err) {
    console.log(`  Failed: ${err.message}\n`);
    await pool.end();
  }
}

console.log('\nAll connection attempts failed.');
console.log('\nPlease run the SQL manually:');
console.log('https://supabase.com/dashboard/project/qbyvzxouutytpmldfuyo/sql/new');

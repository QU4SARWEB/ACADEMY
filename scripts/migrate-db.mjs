import { readFileSync } from 'fs';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_profiles.sql');
const sql = readFileSync(sqlPath, 'utf8');

const dbPass = '9f287e30-681e-4e4e-bf49-14ca42935eab';
const conn = `postgresql://postgres:${encodeURIComponent(dbPass)}@db.qbyvzxouutytpmldfuyo.supabase.co:5432/postgres`;

const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 10000 });

try {
  const client = await pool.connect();
  console.log('Connected to database.\n');
  await client.query(sql);
  console.log('Migrations executed successfully!');
  client.release();
} catch (err) {
  console.log('Error:', err.message);
  if (err.message.includes('ENOTFOUND')) {
    console.log('\nDNS resolution failed. Trying alternative approach...');
    console.log('Please run the SQL manually at:');
    console.log('https://supabase.com/dashboard/project/qbyvzxouutytpmldfuyo/sql/new');
    console.log('\nOr try: npx supabase db push');
  }
} finally {
  await pool.end();
}

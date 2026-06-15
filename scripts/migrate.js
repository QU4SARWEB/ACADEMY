import { readFileSync } from 'fs';
import { createClient } from '@supabase/supabase-js';
import pg from 'pg';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = 'https://qbyvzxouutytpmldfuyo.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'SB_SERVICE_KEY_PLACEHOLDER';

async function runMigrations() {
  console.log('Running SQL migrations...\n');

  const sqlPath = join(__dirname, '..', 'supabase', 'migrations', '00001_profiles.sql');
  const sql = readFileSync(sqlPath, 'utf8');

  // Try direct PostgreSQL connection first
  const dbPass = SUPABASE_SERVICE_ROLE_KEY;
  const conn = `postgresql://postgres:${dbPass}@db.qbyvzxouutytpmldfuyo.supabase.co:5432/postgres`;

  const pool = new pg.Pool({ connectionString: conn, ssl: { rejectUnauthorized: false } });

  try {
    const client = await pool.connect();
    console.log('Connected to database.\n');
    await client.query(sql);
    console.log('Migrations executed successfully!\n');
    client.release();
  } catch (err) {
    console.log('Direct connection failed:', err.message);
    console.log('\nTrying via Supabase client...\n');

    // Fallback: try using Supabase REST API with service role
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false },
    });

    try {
      const { error } = await supabase.rpc('exec_sql', { query: sql });
      if (error) throw error;
      console.log('Migrations executed via RPC!\n');
    } catch (rpcErr) {
      console.log('RPC fallback also failed:', rpcErr.message);
      console.log('\n========================================');
      console.log('Could not auto-execute migrations.');
      console.log('Please run the SQL manually in Supabase SQL Editor:');
      console.log('https://supabase.com/dashboard/project/qbyvzxouutytpmldfuyo/sql/new');
      console.log('========================================\n');
      process.exit(1);
    }
  } finally {
    await pool.end();
  }
}

runMigrations();

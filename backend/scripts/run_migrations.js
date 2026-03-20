import fs from 'fs';
import path from 'path';
import getPool from '../config/postgres.js';

const migrationsDir = path.resolve(process.cwd(), 'db', 'migrations');

const run = async () => {
  const pool = await getPool();
  if (!pool) {
    console.error('No DB pool available; aborting migrations');
    process.exit(1);
  }

  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    console.log('Running migration:', file);
    try {
      await pool.query(sql);
      console.log('Applied:', file);
    } catch (err) {
      console.error('Migration error', file, err.message || err);
    }
  }

  console.log('Migrations complete');
  process.exit(0);
};

run().catch(err => { console.error(err); process.exit(1); });

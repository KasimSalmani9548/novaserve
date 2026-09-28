import { testConnection, pool } from './connection';

async function main() {
  await testConnection();
  await pool.end();
  process.exit(0);
}
main().catch(console.error);
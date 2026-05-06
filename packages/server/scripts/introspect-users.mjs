import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(
  `SELECT column_name, data_type, is_nullable, column_default
   FROM information_schema.columns
   WHERE table_name='users'
   ORDER BY ordinal_position`
);
console.log(JSON.stringify(r.rows, null, 2));
const e = await c.query(`SELECT email, role, email_verified, is_active FROM users ORDER BY email`);
console.log("\n--- existing users ---");
console.log(JSON.stringify(e.rows, null, 2));
await c.end();

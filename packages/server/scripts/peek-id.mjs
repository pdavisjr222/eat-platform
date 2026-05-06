import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`SELECT id, email FROM users LIMIT 3`);
console.log(JSON.stringify(r.rows, null, 2));
await c.end();

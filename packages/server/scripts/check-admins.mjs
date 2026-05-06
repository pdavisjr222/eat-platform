import pg from "pg";
const c = new pg.Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
await c.connect();
const r = await c.query(`SELECT email, role, email_verified FROM users WHERE email IN ('site@sitemedia.us','digitallabmiami@gmail.com') ORDER BY email`);
console.log("Admin email rows:");
console.log(JSON.stringify(r.rows, null, 2));

const cols = await c.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name='audit_logs' ORDER BY ordinal_position`);
console.log("\naudit_logs columns:");
console.log(cols.rows.map(x => `  ${x.column_name} (${x.data_type})`).join("\n"));
await c.end();

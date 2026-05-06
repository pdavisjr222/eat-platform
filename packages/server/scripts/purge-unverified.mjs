// One-shot cleanup: delete every user with email_verified = false plus
// every row that points at them via a foreign key. Auto-discovers FK
// constraints from information_schema so we don't have to hardcode
// column names. Wrapped in a single transaction.
//
// Run via:  railway run --service "@eat/server" -- node packages/server/scripts/purge-unverified.mjs

import pg from "pg";

const { Client } = pg;

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FATAL: DATABASE_URL not in env. Run via `railway run -- node ...`");
  process.exit(1);
}

const client = new Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  console.log("--- BEFORE ---");
  const before = await client.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE email_verified = false)::int AS unverified,
       COUNT(*) FILTER (WHERE email_verified = true)::int AS verified
     FROM users`
  );
  console.log("Total users:     ", before.rows[0].total);
  console.log("Unverified:      ", before.rows[0].unverified);
  console.log("Verified (kept): ", before.rows[0].verified);

  if (before.rows[0].unverified === 0) {
    console.log("\nNothing to delete. Exiting.");
    await client.end();
    process.exit(0);
  }

  // Discover every FK that points at users(id)
  const fks = await client.query(`
    SELECT
      tc.table_name AS child_table,
      kcu.column_name AS child_col,
      tc.constraint_name AS constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON tc.constraint_name = ccu.constraint_name
     AND tc.table_schema = ccu.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
      AND tc.table_schema = 'public'
    ORDER BY tc.table_name, kcu.column_name
  `);

  console.log(`\nDiscovered ${fks.rows.length} FK(s) pointing at users.id:`);
  fks.rows.forEach((r) =>
    console.log(`  - ${r.child_table}.${r.child_col}`)
  );

  await client.query("BEGIN");

  // Stage purge target ids in a temp table so every cascade query hits the same set
  await client.query(
    `CREATE TEMP TABLE _purge_users ON COMMIT DROP AS
       SELECT id FROM users WHERE email_verified = false`
  );

  // Self-FK on users (e.g. referred_by) needs to be nulled out, not row-deleted,
  // for any verified user pointing at a deleted unverified user.
  console.log("\n--- CASCADE DELETE ---");
  let totalCascadeDeleted = 0;
  for (const { child_table, child_col } of fks.rows) {
    if (child_table === "users") {
      // Self-FK: null out instead of delete
      const res = await client.query(
        `UPDATE users SET "${child_col}" = NULL
           WHERE "${child_col}" IN (SELECT id FROM _purge_users)
             AND id NOT IN (SELECT id FROM _purge_users)`
      );
      if (res.rowCount > 0) {
        console.log(`  users.${child_col}: ${res.rowCount} self-FK references nulled`);
      }
      continue;
    }
    try {
      const res = await client.query(
        `DELETE FROM "${child_table}"
           WHERE "${child_col}" IN (SELECT id FROM _purge_users)`
      );
      if (res.rowCount > 0) {
        console.log(`  ${child_table}.${child_col}: ${res.rowCount} rows`);
        totalCascadeDeleted += res.rowCount;
      }
    } catch (err) {
      console.log(`  ${child_table}.${child_col}: SKIPPED (${err.message.split("\n")[0]})`);
    }
  }

  // Finally: delete the unverified users
  const userDel = await client.query(
    `DELETE FROM users WHERE email_verified = false`
  );
  console.log(`\n  users: ${userDel.rowCount} rows DELETED`);

  await client.query("COMMIT");

  console.log("\n--- AFTER ---");
  const after = await client.query(
    `SELECT
       COUNT(*)::int AS total,
       COUNT(*) FILTER (WHERE email_verified = false)::int AS unverified,
       COUNT(*) FILTER (WHERE email_verified = true)::int AS verified
     FROM users`
  );
  console.log("Total users:     ", after.rows[0].total);
  console.log("Unverified:      ", after.rows[0].unverified);
  console.log("Verified (kept): ", after.rows[0].verified);
  console.log(
    `\nDone. ${userDel.rowCount} unverified users + ${totalCascadeDeleted} related rows removed.`
  );
} catch (err) {
  console.error("\nERROR — rolling back:", err.message);
  try {
    await client.query("ROLLBACK");
  } catch (_) {}
  process.exitCode = 1;
} finally {
  await client.end();
}

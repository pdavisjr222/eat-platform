// Bootstrap the two production admin accounts.
//
// Creates (or upgrades) both admin emails with a fresh randomly-generated
// temporary password, role='admin', email_verified=true. Wraps everything
// in a single transaction.
//
// Run via:
//   railway run --service "@eat/server" -- node packages/server/scripts/bootstrap-admins.mjs

import pg from "pg";
import bcrypt from "bcrypt";
import crypto from "crypto";

const ADMIN_EMAILS = ["site@sitemedia.us", "digitallabmiami@gmail.com"];
const TEMP_PASSWORD_LENGTH = 16;
const BCRYPT_ROUNDS = 10;

// Unambiguous alphabet: no I, l, 1, O, 0
const PWCHARS = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
function genPassword(len = TEMP_PASSWORD_LENGTH) {
  const bytes = crypto.randomBytes(len);
  let out = "";
  for (let i = 0; i < len; i++) out += PWCHARS[bytes[i] % PWCHARS.length];
  return out;
}

function genReferralCode() {
  return crypto.randomBytes(5).toString("hex").toUpperCase(); // 10-char hex
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("FATAL: DATABASE_URL not set");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

const created = [];

try {
  await client.query("BEGIN");

  for (const email of ADMIN_EMAILS) {
    const tempPassword = genPassword();
    const hash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);

    const existing = await client.query(
      `SELECT id, email, role FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existing.rows.length > 0) {
      await client.query(
        `UPDATE users SET
           role = 'admin',
           email_verified = true,
           is_active = true,
           is_banned = false,
           banned_reason = NULL,
           banned_at = NULL,
           banned_by = NULL,
           password_hash = $1,
           updated_at = NOW()
         WHERE email = $2`,
        [hash, email.toLowerCase()]
      );
      created.push({
        action: "UPGRADED",
        email,
        id: existing.rows[0].id,
        wasRole: existing.rows[0].role,
        tempPassword,
      });
    } else {
      const id = crypto.randomUUID();
      const referralCode = genReferralCode();
      const displayName = email.split("@")[0];
      await client.query(
        `INSERT INTO users (
           id, name, email, password_hash, role, email_verified, is_active,
           referral_code, created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, 'admin', true, true,
           $5, NOW(), NOW()
         )`,
        [id, displayName, email.toLowerCase(), hash, referralCode]
      );
      created.push({
        action: "CREATED",
        email,
        id,
        wasRole: null,
        tempPassword,
      });
    }
  }

  // Commit user creation FIRST so a downstream audit_logs failure can't roll it back
  await client.query("COMMIT");

  // Audit-log the bootstrap separately (best-effort)
  for (const c of created) {
    try {
      await client.query(
        `INSERT INTO audit_logs (id, user_id, action, entity_type, entity_id, new_values, created_at)
         VALUES ($1, $2, 'admin.bootstrap', 'user', $3, $4, NOW())`,
        [
          crypto.randomUUID(),
          c.id,
          c.id,
          JSON.stringify({ action: c.action, wasRole: c.wasRole, by: "bootstrap-admins.mjs" }),
        ]
      );
    } catch (e) {
      console.warn(`  (audit_logs write failed: ${e.message.split("\n")[0]} -- not fatal)`);
    }
  }

  console.log("\n========================================================");
  console.log("  TWO ADMIN ACCOUNTS READY -- TEMP PASSWORDS BELOW");
  console.log("  Save these now; they are not stored anywhere else.");
  console.log("========================================================\n");

  for (const c of created) {
    console.log(`  ${c.action.padEnd(9)}  ${c.email}`);
    console.log(`             temp password: ${c.tempPassword}`);
    console.log("");
  }

  console.log("Both admins should:");
  console.log("  1. Log in at https://eat-platform-web.vercel.app/auth/login");
  console.log("  2. Use 'Forgot password?' link to set their own password");
  console.log("  3. Confirm role = admin via /api/auth/me\n");
} catch (err) {
  console.error("FAILED -- rolling back:", err.message);
  try {
    await client.query("ROLLBACK");
  } catch (_) {}
  process.exitCode = 1;
} finally {
  await client.end();
}

// Create or reset a dashboard login.
//   Market contact: PASSWORD='...' node scripts/create-user.mjs fresno "Fresno" --markets "Fresno"
//   Master (Gus):   PASSWORD='...' node scripts/create-user.mjs gus "All Markets" --master
//   Several markets: --markets "Fresno,San Diego"
// Re-running for an existing username resets its password and scope.
import bcrypt from "bcryptjs";
import pg from "pg";

const [username, label, ...flags] = process.argv.slice(2);
const password = process.env.PASSWORD;
if (!username || !label || !password) {
  console.error("Usage: PASSWORD='...' node scripts/create-user.mjs <username> <label> [--master | --markets \"A,B\"]");
  process.exit(1);
}
if (password.length < 12) {
  console.error("Password must be at least 12 characters.");
  process.exit(1);
}
const master = flags.includes("--master");
const mi = flags.indexOf("--markets");
const markets = mi >= 0 ? flags[mi + 1].split(",").map((s) => s.trim()).filter(Boolean) : [];
if (!master && markets.length === 0) {
  console.error("Give --master or --markets.");
  process.exit(1);
}

const hash = await bcrypt.hash(password, 12);
const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
await pool.query(
  `INSERT INTO dashboard_users (username, password_hash, label, categories, is_master)
   VALUES ($1,$2,$3,$4,$5)
   ON CONFLICT (username) DO UPDATE SET password_hash=$2, label=$3, categories=$4, is_master=$5, active=true`,
  [username.toLowerCase(), hash, label, markets, master]
);
console.log(`OK: ${username.toLowerCase()} (${master ? "master" : markets.join(", ")})`);
await pool.end();

import "dotenv/config";
import { Pool } from "pg";

async function addColumnIfMissing(
  pool: Pool,
  table: string,
  column: string,
  definition: string
) {
  const { rows } = await pool.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2`,
    [table, column]
  );
  if (rows.length === 0) {
    await pool.query(`ALTER TABLE public.${table} ${definition}`);
    console.log(`  Added ${table}.${column}`);
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL is not set");
    process.exit(1);
  }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : false,
  });

  try {
    await addColumnIfMissing(pool, "users", "first_name", "ADD COLUMN first_name character varying");
    await addColumnIfMissing(pool, "users", "last_name", "ADD COLUMN last_name character varying");
    await addColumnIfMissing(pool, "users", "profile_image_url", "ADD COLUMN profile_image_url character varying");
    await addColumnIfMissing(pool, "users", "is_super_admin", "ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false");
    await addColumnIfMissing(pool, "users", "role", "ADD COLUMN role text DEFAULT 'STUDENT'");
    await addColumnIfMissing(pool, "users", "department", "ADD COLUMN department text");
    await addColumnIfMissing(pool, "users", "clearance_level", "ADD COLUMN clearance_level text DEFAULT 'LEVEL_1'");
    await addColumnIfMissing(pool, "users", "updated_at", "ADD COLUMN updated_at timestamp DEFAULT now()");
    console.log("✅ User columns synced. Run 'npm run db:push' if tenants table is missing.");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

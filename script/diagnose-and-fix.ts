import "dotenv/config";
import { Pool } from "pg";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : false,
  });

  try {
    // Get all columns in users table
    const { rows: usersCols } = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users'
      ORDER BY ordinal_position
    `);
    console.log("=== USERS TABLE COLUMNS ===");
    usersCols.forEach(c => console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

    // Check if academic_year column exists
    const hasAY = usersCols.some(c => c.column_name === 'academic_year');
    console.log(`\nacademic_year column exists: ${hasAY}`);

    if (!hasAY) {
      console.log("Adding missing columns to users table...");
      const missingCols = [
        ["academic_year", "ALTER TABLE users ADD COLUMN IF NOT EXISTS academic_year text"],
        ["semester", "ALTER TABLE users ADD COLUMN IF NOT EXISTS semester text"],
        ["bio", "ALTER TABLE users ADD COLUMN IF NOT EXISTS bio text"],
        ["location", "ALTER TABLE users ADD COLUMN IF NOT EXISTS location text"],
        ["skills", "ALTER TABLE users ADD COLUMN IF NOT EXISTS skills text[]"],
        ["interests", "ALTER TABLE users ADD COLUMN IF NOT EXISTS interests text[]"],
        ["clearance_level", "ALTER TABLE users ADD COLUMN IF NOT EXISTS clearance_level text DEFAULT 'LEVEL_1'"],
      ];
      for (const [col, sql] of missingCols) {
        const exists = usersCols.some(c => c.column_name === col);
        if (!exists) {
          await pool.query(sql);
          console.log(`  ✅ Added column: ${col}`);
        } else {
          console.log(`  ⏭  Column already exists: ${col}`);
        }
      }
    }

    // Check other important tables
    const tables = ["departments", "academic_years", "semesters", "calendar_events", "notifications", "courses", "course_enrollments", "course_notes"];
    console.log("\n=== TABLE STATUS ===");
    for (const tbl of tables) {
      const { rows } = await pool.query(`SELECT COUNT(*) as c FROM information_schema.tables WHERE table_schema='public' AND table_name='${tbl}'`);
      console.log(`  ${tbl}: ${rows[0].c === '1' ? '✅ exists' : '❌ MISSING'}`);
    }

    console.log("\n✅ Diagnosis complete!");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

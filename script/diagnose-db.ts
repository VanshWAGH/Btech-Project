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
    // List all tables
    const { rows: tables } = await pool.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' ORDER BY table_name
    `);
    console.log("\n📊 Tables in database:");
    tables.forEach(t => console.log(" -", t.table_name));

    // Show users table columns
    const { rows: userCols } = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'users'
      ORDER BY ordinal_position
    `);
    console.log("\n👤 Users table columns:");
    userCols.forEach(c => console.log(` - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));

    // Show tenants table columns if it exists
    const { rows: tenantCols } = await pool.query(`
      SELECT column_name, data_type, column_default, is_nullable
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = 'tenants'
      ORDER BY ordinal_position
    `);
    if (tenantCols.length > 0) {
      console.log("\n🏢 Tenants table columns:");
      tenantCols.forEach(c => console.log(` - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable})`));
    }

    // Count users
    try {
      const { rows: userCount } = await pool.query(`SELECT COUNT(*) FROM users`);
      console.log(`\n👥 User count: ${userCount[0].count}`);
    } catch (e) {}

    // Count tenants
    try {
      const { rows: tenantCount } = await pool.query(`SELECT COUNT(*) FROM tenants`);
      console.log(`🏢 Tenant count: ${tenantCount[0].count}`);
      const { rows: tenantRows } = await pool.query(`SELECT id, name, type FROM tenants LIMIT 5`);
      tenantRows.forEach(t => console.log(`   - [${t.id}] ${t.name} (${t.type})`));
    } catch (e: any) { console.log("  tenants table missing:", e.message); }

  } finally {
    await pool.end();
  }
}

main();

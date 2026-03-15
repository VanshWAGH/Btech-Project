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
    console.log("Creating new university tables...\n");

    // 1. departments
    await pool.query(`
      CREATE TABLE IF NOT EXISTS departments (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name text NOT NULL,
        head_id integer REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS departments_tenant_idx ON departments(tenant_id)`);
    console.log("✅ departments table ready");

    // 2. academic_years
    await pool.query(`
      CREATE TABLE IF NOT EXISTS academic_years (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        name text NOT NULL,
        start_date timestamp NOT NULL,
        end_date timestamp NOT NULL,
        is_active boolean DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS academic_years_tenant_idx ON academic_years(tenant_id)`);
    console.log("✅ academic_years table ready");

    // 3. semesters
    await pool.query(`
      CREATE TABLE IF NOT EXISTS semesters (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        academic_year_id integer NOT NULL REFERENCES academic_years(id) ON DELETE CASCADE,
        name text NOT NULL,
        start_date timestamp NOT NULL,
        end_date timestamp NOT NULL,
        is_active boolean DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `);
    await pool.query(`CREATE INDEX IF NOT EXISTS semesters_tenant_idx ON semesters(tenant_id)`);
    await pool.query(`CREATE INDEX IF NOT EXISTS semesters_year_idx ON semesters(academic_year_id)`);
    console.log("✅ semesters table ready");

    // 4. Add status column to calendar_events if missing
    const { rows: eventCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='calendar_events' AND column_name='status'
    `);
    if (eventCols.length === 0) {
      await pool.query(`ALTER TABLE calendar_events ADD COLUMN status text NOT NULL DEFAULT 'approved'`);
      console.log("✅ Added status column to calendar_events");
    } else {
      console.log("⏭  calendar_events.status already exists");
    }

    // 5. Seed default departments for existing tenant
    const { rows: tenantRows } = await pool.query(`SELECT id FROM tenants LIMIT 1`);
    if (tenantRows.length > 0) {
      const tenantId = tenantRows[0].id;
      const { rows: deptCount } = await pool.query(`SELECT COUNT(*) as c FROM departments WHERE tenant_id = $1`, [tenantId]);
      if (parseInt(deptCount[0].c) === 0) {
        await pool.query(`
          INSERT INTO departments (tenant_id, name) VALUES
          ($1, 'Computer Engineering'),
          ($1, 'Information Technology'),
          ($1, 'Mechanical Engineering'),
          ($1, 'Civil Engineering'),
          ($1, 'Electronics Engineering')
        `, [tenantId]);
        console.log("✅ Seeded default departments");

        // Seed academic year
        const { rows: yearRows } = await pool.query(`
          INSERT INTO academic_years (tenant_id, name, start_date, end_date, is_active)
          VALUES ($1, '2024-2025', '2024-07-01', '2025-06-30', true)
          RETURNING id
        `, [tenantId]);
        const yearId = yearRows[0].id;

        await pool.query(`
          INSERT INTO semesters (tenant_id, academic_year_id, name, start_date, end_date, is_active) VALUES
          ($1, $2, 'Semester I', '2024-07-01', '2024-11-30', false),
          ($1, $2, 'Semester II', '2025-01-01', '2025-06-30', true)
        `, [tenantId, yearId]);
        console.log("✅ Seeded academic year and semesters");
      }
    }

    console.log("\n🎉 All university tables created successfully!");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

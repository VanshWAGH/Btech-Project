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
    // The users table has id as integer, but our new schema expects varchar UUID.
    // We need to add missing columns and ensure compatibility.
    
    // Add 'username' column if missing (might be needed by old constraints)
    // Actually - check if 'username' NOT NULL constraint will block inserts without it
    const { rows: usernameCols } = await pool.query(`
      SELECT is_nullable, column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='username'
    `);
    
    if (usernameCols.length > 0 && usernameCols[0].is_nullable === 'NO') {
      // Make username nullable or give it a default
      await pool.query(`ALTER TABLE users ALTER COLUMN username SET DEFAULT ''`);
      console.log("  ✅ Made username column have default empty string");
    }

    // Check if 'name' column is NOT NULL
    const { rows: nameCols } = await pool.query(`
      SELECT is_nullable FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='name'
    `);
    if (nameCols.length > 0 && nameCols[0].is_nullable === 'NO') {
      await pool.query(`ALTER TABLE users ALTER COLUMN name SET DEFAULT ''`);
      console.log("  ✅ Made name column have default empty string");
    }

    // Check 'role' - it's NOT NULL in old schema, we should keep it as is but allow 'STUDENT' default
    const { rows: roleCols } = await pool.query(`
      SELECT is_nullable, column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='role'
    `);
    if (roleCols.length > 0) {
      if (!roleCols[0].column_default) {
        await pool.query(`ALTER TABLE users ALTER COLUMN role SET DEFAULT 'STUDENT'`);
        console.log("  ✅ Set role DEFAULT to STUDENT");
      }
      if (roleCols[0].is_nullable === 'NO') {
        await pool.query(`ALTER TABLE users ALTER COLUMN role DROP NOT NULL`);
        console.log("  ✅ Made role column nullable");
      }
    }

    // The id column in the old schema is INTEGER, not UUID varchar.
    // We need to work with this. Let's check if it uses a sequence.
    const { rows: idInfo } = await pool.query(`
      SELECT column_default FROM information_schema.columns
      WHERE table_schema='public' AND table_name='users' AND column_name='id'
    `);
    console.log("  users.id default:", idInfo[0]?.column_default);

    // Ensure first_name and last_name are nullable (they should already be)
    // Ensure email column exists and is unique
    const { rows: emailIdx } = await pool.query(`
      SELECT indexname FROM pg_indexes 
      WHERE tablename='users' AND indexdef LIKE '%email%'
    `);
    console.log("  Email indexes:", emailIdx.map(r => r.indexname).join(", ") || "none");

    // Seed demo tenants if none exist
    const { rows: tCount } = await pool.query(`SELECT COUNT(*) as c FROM tenants`);
    if (parseInt(tCount[0].c) === 0) {
      await pool.query(`
        INSERT INTO tenants (name, domain, type) VALUES
          ('Nexus University', 'nexus.edu', 'academic'),
          ('TechCorp Enterprise', 'techcorp.com', 'enterprise'),
          ('Research Institute Alpha', 'ria.org', 'research')
      `);
      console.log("  ✅ Seeded 3 demo tenants");
    }

    // Create tenant_members table if missing
    const { rows: tmExists } = await pool.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema='public' AND table_name='tenant_members'
    `);
    if (tmExists.length === 0) {
      await pool.query(`
        CREATE TABLE tenant_members (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          role text NOT NULL,
          department text,
          permissions text[],
          access_level text,
          organization_type text,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `);
      await pool.query(`CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx ON tenant_members(tenant_id)`);
      await pool.query(`CREATE INDEX IF NOT EXISTS tenant_members_user_idx ON tenant_members(user_id)`);
      console.log("  ✅ Created tenant_members table");
    } else {
      console.log("  ⏭  tenant_members table exists");
    }

    // Create other missing tables
    const missing = [
      ["announcements", `
        CREATE TABLE IF NOT EXISTS announcements (
          id serial PRIMARY KEY,
          tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text NOT NULL,
          department text,
          target_role text,
          created_by integer NOT NULL REFERENCES users(id),
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["audit_logs", `
        CREATE TABLE IF NOT EXISTS audit_logs (
          id serial PRIMARY KEY,
          tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
          user_id integer REFERENCES users(id),
          action text NOT NULL,
          entity_type text NOT NULL,
          entity_id text,
          details text,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["course_enrollments", `
        CREATE TABLE IF NOT EXISTS course_enrollments (
          id serial PRIMARY KEY,
          course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          enrolled_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["course_notes", `
        CREATE TABLE IF NOT EXISTS course_notes (
          id serial PRIMARY KEY,
          course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text,
          file_url text,
          file_type text,
          topic text,
          tags text[],
          uploaded_by integer NOT NULL REFERENCES users(id),
          uploaded_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["calendar_events", `
        CREATE TABLE IF NOT EXISTS calendar_events (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          title text NOT NULL,
          description text,
          department text NOT NULL,
          event_date timestamp NOT NULL,
          event_type text NOT NULL,
          created_by integer NOT NULL REFERENCES users(id),
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["notifications", `
        CREATE TABLE IF NOT EXISTS notifications (
          id serial PRIMARY KEY,
          user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
          type text NOT NULL,
          title text NOT NULL,
          message text NOT NULL,
          related_id integer,
          is_read boolean DEFAULT false,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["queries", `
        CREATE TABLE IF NOT EXISTS queries (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          user_id integer NOT NULL REFERENCES users(id),
          query text NOT NULL,
          response text,
          context text,
          relevant_docs text[],
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
      ["documents", `
        CREATE TABLE IF NOT EXISTS documents (
          id serial PRIMARY KEY,
          tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
          title text NOT NULL,
          content text NOT NULL,
          category text,
          uploaded_by integer NOT NULL REFERENCES users(id),
          status text DEFAULT 'APPROVED',
          is_public boolean DEFAULT false,
          created_at timestamp NOT NULL DEFAULT now()
        )
      `],
    ];

    for (const [name, sql] of missing) {
      try {
        await pool.query(sql);
        console.log(`  ✅ ${name} table ready`);
      } catch (e: any) {
        if (e.code === '42P07') console.log(`  ⏭  ${name} table exists`);
        else console.error(`  ❌ ${name}:`, e.message);
      }
    }

    // Fix courses table - add any missing columns
    const { rows: coursesCols } = await pool.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema='public' AND table_name='courses'
    `);
    const courseColNames = coursesCols.map(c => c.column_name);
    
    const courseFixups: [string, string][] = [
      ["course_id", "ADD COLUMN course_id varchar(50)"],
      ["course_name", "ADD COLUMN course_name text"],
      ["course_code", "ADD COLUMN course_code varchar(30)"],
      ["semester", "ADD COLUMN semester text"],
      ["description", "ADD COLUMN description text"],
    ];
    for (const [col, def] of courseFixups) {
      if (!courseColNames.includes(col)) {
        await pool.query(`ALTER TABLE courses ${def}`);
        console.log(`  ✅ Added courses.${col}`);
      }
    }

    console.log("\n🎉 Database patched successfully!");
    
    // Final state
    const { rows: finalUsers } = await pool.query(`SELECT COUNT(*) as c FROM users`);
    const { rows: finalTenants } = await pool.query(`SELECT id, name, type FROM tenants`);
    console.log(`\n  Users: ${finalUsers[0].c}`);
    console.log(`  Tenants:`);
    finalTenants.forEach(t => console.log(`    - [${t.id}] ${t.name} (${t.type})`));

  } finally {
    await pool.end();
  }
}

main().catch(console.error);

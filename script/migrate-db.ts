import "dotenv/config";
import { Pool } from "pg";

async function run(pool: Pool, sql: string, label: string) {
  try {
    await pool.query(sql);
    console.log(`  ✅ ${label}`);
  } catch (err: any) {
    if (err.code === "42P07" || err.message?.includes("already exists")) {
      console.log(`  ⏭  ${label} (already exists)`);
    } else {
      console.error(`  ❌ ${label}:`, err.message);
      throw err;
    }
  }
}

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.error("DATABASE_URL not set"); process.exit(1); }

  const pool = new Pool({
    connectionString: url,
    ssl: url.includes("neon.tech") ? { rejectUnauthorized: false } : false,
  });

  try {
    // ── Ensure session table ──────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS session (
        sid varchar PRIMARY KEY,
        sess jsonb NOT NULL,
        expire timestamp NOT NULL
      )
    `, "session table");
    await run(pool, `CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire)`, "session index");

    // ── Ensure users table has all required columns ───────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS users (
        id varchar PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar UNIQUE NOT NULL,
        password text NOT NULL,
        first_name varchar,
        last_name varchar,
        profile_image_url varchar,
        is_super_admin boolean NOT NULL DEFAULT false,
        role text DEFAULT 'STUDENT',
        department text,
        clearance_level text DEFAULT 'LEVEL_1',
        created_at timestamp DEFAULT now(),
        updated_at timestamp DEFAULT now()
      )
    `, "users table");

    // Patch missing columns if users table already existed
    const columns = [
      ["first_name", "ADD COLUMN first_name varchar"],
      ["last_name", "ADD COLUMN last_name varchar"],
      ["profile_image_url", "ADD COLUMN profile_image_url varchar"],
      ["is_super_admin", "ADD COLUMN is_super_admin boolean NOT NULL DEFAULT false"],
      ["role", "ADD COLUMN role text DEFAULT 'STUDENT'"],
      ["department", "ADD COLUMN department text"],
      ["clearance_level", "ADD COLUMN clearance_level text DEFAULT 'LEVEL_1'"],
      ["updated_at", "ADD COLUMN updated_at timestamp DEFAULT now()"],
    ];

    for (const [col, def] of columns) {
      const { rows } = await pool.query(
        `SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='users' AND column_name=$1`,
        [col]
      );
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE public.users ${def}`);
        console.log(`  ✅ Added users.${col}`);
      }
    }

    // ── Tenants ───────────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS tenants (
        id serial PRIMARY KEY,
        name text NOT NULL,
        domain text,
        type text NOT NULL DEFAULT 'demo',
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "tenants table");

    // ── Tenant members ────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS tenant_members (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        role text NOT NULL,
        department text,
        permissions text[],
        access_level text,
        organization_type text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "tenant_members table");
    await run(pool, `CREATE INDEX IF NOT EXISTS tenant_members_tenant_idx ON tenant_members(tenant_id)`, "tenant_members_tenant_idx");
    await run(pool, `CREATE INDEX IF NOT EXISTS tenant_members_user_idx ON tenant_members(user_id)`, "tenant_members_user_idx");

    // ── Documents ─────────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS documents (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL,
        category text,
        uploaded_by varchar NOT NULL REFERENCES users(id),
        status text DEFAULT 'APPROVED',
        is_public boolean DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "documents table");
    await run(pool, `CREATE INDEX IF NOT EXISTS documents_tenant_idx ON documents(tenant_id)`, "documents_tenant_idx");

    // ── Queries ───────────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS queries (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        user_id varchar NOT NULL REFERENCES users(id),
        query text NOT NULL,
        response text,
        context text,
        relevant_docs text[],
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "queries table");
    await run(pool, `CREATE INDEX IF NOT EXISTS queries_tenant_idx ON queries(tenant_id)`, "queries_tenant_idx");
    await run(pool, `CREATE INDEX IF NOT EXISTS queries_user_idx ON queries(user_id)`, "queries_user_idx");

    // ── Announcements ─────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS announcements (
        id serial PRIMARY KEY,
        tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
        title text NOT NULL,
        content text NOT NULL,
        department text,
        target_role text,
        created_by varchar NOT NULL REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "announcements table");
    await run(pool, `CREATE INDEX IF NOT EXISTS announcements_tenant_idx ON announcements(tenant_id)`, "announcements_tenant_idx");

    // ── Audit logs ────────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS audit_logs (
        id serial PRIMARY KEY,
        tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
        user_id varchar REFERENCES users(id),
        action text NOT NULL,
        entity_type text NOT NULL,
        entity_id text,
        details text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "audit_logs table");
    await run(pool, `CREATE INDEX IF NOT EXISTS audit_logs_tenant_idx ON audit_logs(tenant_id)`, "audit_logs_tenant_idx");

    // ── Courses ───────────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS courses (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        course_id varchar(50) NOT NULL,
        course_name text NOT NULL,
        course_code varchar(30) NOT NULL,
        department text NOT NULL,
        semester text NOT NULL,
        teacher_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description text,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "courses table");
    await run(pool, `CREATE INDEX IF NOT EXISTS courses_tenant_idx ON courses(tenant_id)`, "courses_tenant_idx");
    await run(pool, `CREATE INDEX IF NOT EXISTS courses_teacher_idx ON courses(teacher_id)`, "courses_teacher_idx");

    // ── Course enrollments ────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id serial PRIMARY KEY,
        course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at timestamp NOT NULL DEFAULT now()
      )
    `, "course_enrollments table");
    await run(pool, `CREATE INDEX IF NOT EXISTS enrollments_course_idx ON course_enrollments(course_id)`, "enrollments_course_idx");
    await run(pool, `CREATE INDEX IF NOT EXISTS enrollments_student_idx ON course_enrollments(student_id)`, "enrollments_student_idx");

    // ── Course notes ──────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS course_notes (
        id serial PRIMARY KEY,
        course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        file_url text,
        file_type text,
        topic text,
        tags text[],
        uploaded_by varchar NOT NULL REFERENCES users(id),
        uploaded_at timestamp NOT NULL DEFAULT now()
      )
    `, "course_notes table");
    await run(pool, `CREATE INDEX IF NOT EXISTS notes_course_idx ON course_notes(course_id)`, "notes_course_idx");

    // ── Calendar events ───────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS calendar_events (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        title text NOT NULL,
        description text,
        department text NOT NULL,
        event_date timestamp NOT NULL,
        event_type text NOT NULL,
        created_by varchar NOT NULL REFERENCES users(id),
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "calendar_events table");
    await run(pool, `CREATE INDEX IF NOT EXISTS calendar_tenant_idx ON calendar_events(tenant_id)`, "calendar_tenant_idx");
    await run(pool, `CREATE INDEX IF NOT EXISTS calendar_dept_idx ON calendar_events(department)`, "calendar_dept_idx");

    // ── Notifications ─────────────────────────────────────────────────────
    await run(pool, `
      CREATE TABLE IF NOT EXISTS notifications (
        id serial PRIMARY KEY,
        user_id varchar NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tenant_id integer REFERENCES tenants(id) ON DELETE CASCADE,
        type text NOT NULL,
        title text NOT NULL,
        message text NOT NULL,
        related_id integer,
        is_read boolean DEFAULT false,
        created_at timestamp NOT NULL DEFAULT now()
      )
    `, "notifications table");
    await run(pool, `CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id)`, "notifications_user_idx");

    // ── Seed 3 demo tenants ───────────────────────────────────────────────
    const { rows: existing } = await pool.query(`SELECT id FROM tenants LIMIT 1`);
    if (existing.length === 0) {
      await pool.query(`
        INSERT INTO tenants (name, domain, type) VALUES
          ('Nexus University', 'nexus.edu', 'academic'),
          ('TechCorp Enterprise', 'techcorp.com', 'enterprise'),
          ('Research Institute Alpha', 'ria.org', 'research')
      `);
      console.log("  ✅ Seeded 3 demo tenants");
    } else {
      console.log("  ⏭  Tenants already seeded");
    }

    console.log("\n🎉 Database migration complete!");
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();

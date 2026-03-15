import { pool } from "./server/db";

async function main() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS courses (
        id serial PRIMARY KEY,
        tenant_id integer NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        course_id varchar(50) NOT NULL,
        course_name text NOT NULL,
        course_code varchar(30) NOT NULL,
        department text NOT NULL,
        semester text NOT NULL,
        teacher_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        description text,
        created_at timestamp NOT NULL DEFAULT now()
      );
      
      CREATE TABLE IF NOT EXISTS course_enrollments (
        id serial PRIMARY KEY,
        course_id integer NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
        student_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        enrolled_at timestamp NOT NULL DEFAULT now()
      );
      
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
      );
    `);
    console.log("tables created");
  } catch(e) {
    console.log(e);
  }
  process.exit(0);
}
main();

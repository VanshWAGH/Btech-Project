import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function main() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_URL?.includes("neon.tech") ? { rejectUnauthorized: false } : false
  });

  try {
    console.log("Updating database records: 'Computer Science' -> 'Computer Engineering'");

    const usersRes = await pool.query(`UPDATE users SET department = 'Computer Engineering' WHERE department = 'Computer Science'`);
    console.log(`Updated users: ${usersRes.rowCount}`);

    const coursesRes = await pool.query(`UPDATE courses SET department = 'Computer Engineering' WHERE department = 'Computer Science'`);
    console.log(`Updated courses: ${coursesRes.rowCount}`);

    const mmRes = await pool.query(`UPDATE tenant_members SET department = 'Computer Engineering' WHERE department = 'Computer Science'`);
    console.log(`Updated tenant_members: ${mmRes.rowCount}`);

    const ancRes = await pool.query(`UPDATE announcements SET department = 'Computer Engineering' WHERE department = 'Computer Science'`);
    console.log(`Updated announcements: ${ancRes.rowCount}`);

    console.log("Done updating database.");
  } finally {
    await pool.end();
  }
}

main().catch(console.error);

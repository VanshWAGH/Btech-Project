import { pool } from "./server/db";

async function main() {
  try {
    await pool.query('ALTER TABLE users ADD CONSTRAINT users_email_unique UNIQUE (email)');
    console.log("altered");
  } catch(e) {
    console.log(e);
  }
  process.exit(0);
}
main();

import { db } from "./server/db";
import { tenants } from "@shared/schema";

async function main() {
  const allTenants = await db.select().from(tenants);
  console.log(allTenants);
  process.exit(0);
}
main();

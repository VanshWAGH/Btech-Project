/**
 * ============================================================
 * DOCUMENT INGESTION SCRIPT
 * ============================================================
 * Reads all documents from the PostgreSQL database and
 * bulk-ingests them into Qdrant Cloud as vector embeddings.
 *
 * Usage:
 *   npx tsx script/ingest-vectors.ts
 *
 * Or ingest a single doc by ID:
 *   npx tsx script/ingest-vectors.ts --doc=42
 * ============================================================
 */

import "dotenv/config";
import { db }       from "../server/db";
import { documents, tenants } from "../shared/schema";
import { eq }       from "drizzle-orm";
import {
  ensureCollection,
  ingestDocument,
  getVectorDBStatus,
  COLLECTION_NAME,
} from "../server/vectordb";

async function main() {
  console.log("\n🚀 NexusRAG — Qdrant Cloud Ingestion Script");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // ── Config Check ──────────────────────────────────────────
  if (!process.env.QDRANT_URL || !process.env.QDRANT_API_KEY) {
    console.warn("⚠️  QDRANT_URL or QDRANT_API_KEY missing in .env");
    console.warn("   Set them to connect to Qdrant Cloud.\n");
  }

  if (!process.env.AI_INTEGRATIONS_OPENAI_API_KEY) {
    console.error("❌ AI_INTEGRATIONS_OPENAI_API_KEY is required for embeddings.");
    process.exit(1);
  }

  // ── Parse CLI args ────────────────────────────────────────
  const args = process.argv.slice(2);
  const singleDocArg = args.find((a) => a.startsWith("--doc="));
  const singleDocId  = singleDocArg ? parseInt(singleDocArg.split("=")[1]) : null;

  // ── Ensure collection exists ──────────────────────────────
  console.log(`📦 Collection: ${COLLECTION_NAME}`);
  await ensureCollection();

  // ── Check Status ──────────────────────────────────────────
  const status = await getVectorDBStatus();
  console.log(`🔌 Qdrant URL  : ${status.url}`);
  console.log(`📊 Existing pts: ${status.totalPoints}\n`);

  // ── Fetch tenants (for metadata) ──────────────────────────
  const allTenants = await db.select().from(tenants);
  const tenantMap  = new Map(allTenants.map((t) => [t.id, t]));

  // ── Fetch documents to ingest ─────────────────────────────
  let docs;
  if (singleDocId) {
    docs = await db.select().from(documents).where(eq(documents.id, singleDocId));
    if (docs.length === 0) {
      console.error(`❌ Document #${singleDocId} not found in database.`);
      process.exit(1);
    }
    console.log(`🎯 Ingesting single document #${singleDocId}: "${docs[0].title}"\n`);
  } else {
    docs = await db.select().from(documents);
    console.log(`📚 Found ${docs.length} documents to ingest\n`);
  }

  // ── Ingest Loop ───────────────────────────────────────────
  let success = 0;
  let failed  = 0;

  for (const doc of docs) {
    const tenant = tenantMap.get(doc.tenantId);

    process.stdout.write(
      `  [${success + failed + 1}/${docs.length}] "${doc.title.slice(0, 45)}..." `
    );

    try {
      const result = await ingestDocument({
        id:          doc.id,
        title:       doc.title,
        content:     doc.content || doc.title,   // fallback to title if no body
        tenantId:    doc.tenantId,
        department:  tenant?.name      ?? "General",
        course:      doc.category      ?? "General",
        accessLevel: (doc.status === "public"
                      ? "public"
                      : "department") as any,
      });

      console.log(`→ ✅ ${result.chunksIngested} chunks`);
      success++;

      // Rate-limit courtesy: 200ms between docs to avoid OpenAI burst
      await new Promise((r) => setTimeout(r, 200));

    } catch (err: any) {
      console.log(`→ ❌ ${err.message}`);
      failed++;
    }
  }

  // ── Summary ───────────────────────────────────────────────
  console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`✅ Successfully ingested : ${success} documents`);
  if (failed > 0) {
    console.log(`❌ Failed                : ${failed} documents`);
  }

  const finalStatus = await getVectorDBStatus();
  console.log(`📊 Total vectors in DB   : ${finalStatus.totalPoints}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});

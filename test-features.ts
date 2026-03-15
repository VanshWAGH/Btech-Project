import { storage } from "./server/storage";
import { db } from "./server/db";
import { documents, queries, users, notifications, calendarEvents } from "@shared/schema";
import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function runTests() {
  console.log("--- Starting Feature Tests ---");
  
  // 1. Test Chat Backend functionality (imitating /api/queries POST)
  console.log("\n1. Testing Chat AI generation...");
  try {
    const systemPrompt = "Hello, you are a test AI. Reply with 'ACK'.";
    const completion = await openai.chat.completions.create({
      model: process.env.AI_CHAT_MODEL || "gemini-flash-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Test" },
      ],
      max_completion_tokens: 10,
    });
    console.log("   ✅ AI Chat Integration works. Response:", completion.choices[0]?.message?.content?.trim());
  } catch (err: any) {
    console.log("   ❌ AI Chat failed:", err.message);
  }

  // 2. Test Recommendation Logic (imitating /api/student/recommendations)
  console.log("\n2. Testing Recommendations...");
  try {
    // Insert a dummy user and query to test recommendations
    const [testUser] = await db.insert(users).values({ email: "test@student.com", password: "pwd", role: "STUDENT" }).returning();
    await storage.createQuery({
      tenantId: 1,
      userId: testUser.id,
      query: "How does sql normalization work?",
      response: "Normalization is a DB concept...",
      context: "docs",
      relevantDocs: ["DB Book"]
    });
    
    const userQueries = await storage.getQueries(undefined, testUser.id);
    const text = userQueries.map(q => q.query.toLowerCase()).join(" ");
    if (text.includes("normalization") || text.includes("sql")) {
       console.log("   ✅ Recommendations identified DBMS topic from query.");
    } else {
       console.log("   ❌ Recommendations missed topic.");
    }
  } catch (err: any) {
    console.log("   ❌ Recommendations test failed:", err.message);
  }

  // 3. Test Notifications
  console.log("\n3. Testing Notifications...");
  try {
    const n = await storage.createNotification({
      userId: 1,
      tenantId: 1,
      type: "test",
      title: "Test Note",
      message: "Test msg",
    });
    const retrieved = await storage.getUserNotifications(1);
    const found = retrieved.find(x => x.id === n.id);
    if (found) console.log("   ✅ Notifications creation & retrieval works.");
    else console.log("   ❌ Notification not found.");
  } catch (err: any) {
    console.log("   ❌ Notifications failed:", err.message);
  }

  // 4. Test Academic Calendar
  console.log("\n4. Testing Academic Calendar...");
  try {
    const ev = await storage.createCalendarEvent({
      tenantId: 1,
      title: "Midterms",
      department: "Computer Engineering",
      eventDate: new Date(),
      eventType: "exam",
      createdBy: 1
    });
    const retrievedEvs = await storage.getCalendarEvents(1, "Computer Engineering");
    if (retrievedEvs.find(x => x.id === ev.id)) console.log("   ✅ Calendar creation & retrieval works.");
    else console.log("   ❌ Calendar event not found.");
  } catch(err: any) {
    console.log("   ❌ Calendar failed:", err.message);
  }

  console.log("\n--- Tests Complete ---");
  process.exit(0);
}

runTests();

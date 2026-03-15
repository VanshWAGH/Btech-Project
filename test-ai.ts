import OpenAI from "openai";
import "dotenv/config";

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

async function main() {
  const completion = await openai.chat.completions.create({
    model: process.env.AI_CHAT_MODEL || "gemini-flash-latest",
    messages: [
      { role: "system", content: "Reply ACK" },
      { role: "user", content: "Test" },
    ],
    max_tokens: 1024,
  });
  console.log(JSON.stringify(completion, null, 2));
}

main().catch(console.error);

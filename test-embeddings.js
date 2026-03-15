import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL.replace(/"/g, ''),
});

async function main() {
  try {
    const response = await openai.embeddings.create({
      model: "gemini-embedding-001",
      input: "test",
      dimensions: 1536,
    });
    console.log("Success:", response.data[0].embedding.length);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();

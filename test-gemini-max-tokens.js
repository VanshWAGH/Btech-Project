import OpenAI from "openai";
import dotenv from "dotenv";
dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL.replace(/"/g, ''),
});

async function main() {
  try {
    const completion = await openai.chat.completions.create({
      model: "gemini-flash-latest",
      messages: [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "test" },
      ],
      max_completion_tokens: 1024,
    });
    console.log("Success:", completion.choices[0]?.message?.content);
  } catch (err) {
    console.error("Error:", err.message);
  }
}
main();

import "dotenv/config";
import { OpenAI } from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function testModel(model, type = "responses") {
  try {
    if (type === "responses") {
      await openai.responses.create({
        model,
        input: "Test model availability",
        tools: [{ type: "web_search_preview" }],
      });
    } else if (type === "chat") {
      await openai.chat.completions.create({
        model,
        messages: [{ role: "user", content: "Test model availability" }],
        max_tokens: 10,
      });
    }
    console.log(`✅ Model available: ${model}`);
  } catch (err) {
    console.log(`❌ Model not available: ${model}`);
    if (err && err.error && err.error.message) {
      console.log(`   Error: ${err.error.message}`);
    } else {
      console.log(`   Error: ${err.message || err}`);
    }
  }
}

(async () => {
  console.log("\n--- OpenAI Model Availability Test ---\n");
  await testModel("o3-deep-research", "responses");
  await testModel("gpt-4-turbo-preview", "chat");
  console.log("\nTest complete.\n");
})();

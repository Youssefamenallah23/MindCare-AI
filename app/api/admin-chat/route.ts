import { GoogleGenerativeAI } from "@google/generative-ai";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { streamText } from "ai";
import { createGoogleGenerativeAI } from "@ai-sdk/google";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

const google = createGoogleGenerativeAI({
  apiKey: GEMINI_API_KEY!,
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const model = google("gemini-2.0-flash");
const embeddingModel = genAI.getGenerativeModel({
  model: "text-embedding-004",
});

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN);
const db = client.db(ASTRA_DB_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();
    const latestMessage = messages[messages?.length - 1]?.content;

    let docContext = "";

    // Create vector for latest user query
    const embeddingResponse = await embeddingModel.embedContent(latestMessage);
    const vectorEmbedding = embeddingResponse.embedding.values;

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(
        { $vector: { $exists: true } },
        {
          sort: { $vector: vectorEmbedding },
          limit: 10,
        }
      );

      const documents = await cursor.toArray();
      const docsMap = documents?.map((doc) => doc.pageContent);
      docContext = JSON.stringify(docsMap);
    } catch (error) {
      console.error("Error querying Astra DB: " + error);
      docContext = "";
    }

    // 🟢 System template for "Admin File Testing Assistant"
    const template = {
      role: "assistant",
      content: `
**Assistant Role: File Testing & Retrieval**

You are an **AI assistant designed for admins to test and query uploaded files**.
Your goal is to:
- Provide clear, accurate, and concise answers **based on the retrieved documents** in the context.
- Always reference the files when possible.
- If the answer cannot be found in the provided context, say:  
  "I could not find relevant information in the uploaded files."

**Guidelines:**
1. Use the document context as the **primary source of truth**.
2. If multiple documents are relevant, summarize and highlight the connections.
3. Always maintain a professional, clear tone.
4. If context is empty, explicitly state it.

-------------
START CONTEXT
${docContext}
END CONTEXT
-------------
USER QUERY: ${latestMessage}
-------------
[Admin Testing Assistant Protocol Active → Retrieve → Summarize → Respond clearly.]
`,
    };

    const geminiMessages = [template, ...messages].map((msg, i) => ({
      id: String(i),
      role: msg.role === "user" ? "user" : msg.role,
      content: msg.content,
      parts: [{ type: "text", text: msg.content }],
    }));

    const aiStream = streamText({
      model,
      messages: geminiMessages,
    });

    return aiStream.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
}

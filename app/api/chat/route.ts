import { GoogleGenerativeAI } from "@google/generative-ai";
// import { OpenAIStream, StreamingTextResponse } from "@ai-sdk/react";
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
  apiKey: process.env.GEMINI_API_KEY!, // Pass your API key in the config
});

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
// const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

    const embeddingResponse = await embeddingModel.embedContent(latestMessage);
    const vectorEmbedding = embeddingResponse.embedding.values;

    try {
      const collection = await db.collection(ASTRA_DB_COLLECTION!);
      const cursor = await collection.find(
        {
          $vector: {
            $exists: true, // Ensure vectors are present
          },
        },
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

    const template = {
      role: "assistant", // Or 'system'/'model'
      content: `
    **Professional Profile: Mindy - Mental Health & Multi-Day Routine Specialist**
    
    You are Mindy, an AI assistant focused on mental health support via **structured multi-day routines**. Your **primary goal** is to understand user feelings and co-create personalized routines with **specific tasks assigned for each day** of an agreed-upon duration. Use clinically-informed strategies and maintain ethical boundaries.
    Also answer with the same language the user used to ask the question.
    don't push the user into a routine, just ask them if they want to try it.
    don't ask the user do you want a routine while he is starting to express his feelings.Listen to him and then ask him if he wants a routine.
    **Core Competencies:**
    1. **Mental Health Sentiment Analysis:** (As before)
       - Identify emotional patterns, stress triggers...
       - Recognize need for professional help...
       - Prioritize evidence-based strategies...
    
    2. **Multi-Day Routine Development:**
       - Analyze user needs to generate a coherent **routine plan spanning multiple days**.
       - **Assign specific, actionable tasks for EACH day** within the user-defined duration.
       - Include psychoeducation about task benefits.
       - Ensure the routine structure promotes gradual progress or consistency.
    
    3. **Duration Management & Confirmation:** (As before)
       - Always ask user for duration (how many days).
       - Confirm duration and add hidden [DURATION: X DAYS] marker.
    
    **Enhanced Routine Protocol:**
    - **Multi-Day Structure MANDATORY:** Routines proposed within [ROUTINE_START]...[ROUTINE_END] MUST be broken down day-by-day for the *entire requested duration*. Use clear headings like "Day 1:", "Day 2:", etc.
    - **Mandatory Duration Inquiry:** Every routine suggestion must conclude *outside* the [ROUTINE_END] tag by asking the user how many days they want to try it.
    - **Mental Health Integration:** (As before)
    
    **Example Routine Output Format (Inside [ROUTINE_START]...[ROUTINE_END]):**
    [ROUTINE_START]
    **Day 1:**
    * Morning (5 min): 5-4-3-2-1 Sensory Grounding (reduces immediate anxiety).
    * Evening (10 min): Journal one positive experience (builds gratitude).
    
    **Day 2:**
    * Morning (5 min): Repeat Sensory Grounding.
    * Afternoon (15 min): Short walk focusing on surroundings (behavioral activation for mood).
    * Evening (5 min): Plan one small, enjoyable activity for tomorrow.
    
    **Day 3:**
    * Morning (7 min): Guided mindful breathing (increases present moment awareness).
    * Afternoon (15 min): Repeat short walk.
    * Evening (10 min): Repeat positive experience journaling.
    ... (Continue for all days in the duration requested implicitly or explicitly by user) ...
    [ROUTINE_END]
    
    How many days would you like to try this specific plan?
    
    **Enhanced Ethical Framework:** (As before)
    1. **Mental Health Scope:** ...
    2. **Professional Gatekeeping:** ...
    3. **Safety Protocols:** ...
    
    **Duration Handling:** (As before)
    When user specifies duration:
    1. Acknowledge/confirm ("Excellent choice! I'll check in...").
    2. Add hidden marker: [DURATION: X DAYS] at response end.
    
    **Crisis Response Enhancement:** (As before)
    
    -------------
    START CONTEXT
    ${docContext}
    END CONTEXT
    -------------
    USER QUERY: ${latestMessage}
    -------------
    
    [Mindy - Multi-Day Mental Health Routine Protocol Active. Analyze → Create detailed multi-day routine → Request duration → Monitor.]
    `,
    };

    const geminiMessages = [template, ...messages].map((msg, i) => {
      return {
        id: String(i),
        role: msg.role === "user" ? "user" : msg.role,
        content: msg.content,
        parts: [
          {
            type: "text",
            text: msg.content,
          },
        ],
      };
    });

    const aiStream = streamText({
      model: model,
      messages: geminiMessages,
    });

    /* return new Response(aiStream.textStream, {
      headers: { "Content-Type": "text/event-stream" },
    }); */
    return aiStream.toDataStreamResponse();
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
    });
  }
}

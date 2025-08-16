// app/api/upload/route.ts
import { NextResponse } from "next/server";
import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";

/** Ensure Node runtime so Buffer & Node APIs work (not Edge) */
export const runtime = "nodejs";
/** (Optional) increase if your provider needs more time */
export const maxDuration = 60;

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

// ---- Basic env validation (fail fast with clear messages) ----
function requireEnv(name: string, value?: string) {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const GENAI_API_KEY = requireEnv("GEMINI_API_KEY", GEMINI_API_KEY);
const ASTRA_ENDPOINT = requireEnv("ASTRA_DB_ENDPOINT", ASTRA_DB_ENDPOINT);
const ASTRA_TOKEN = requireEnv(
  "ASTRA_DB_APPLICATION_TOKEN",
  ASTRA_DB_APPLICATION_TOKEN
);
const ASTRA_NAMESPACE = requireEnv("ASTRA_DB_NAMESPACE", ASTRA_DB_NAMESPACE);
const ASTRA_COLLECTION = requireEnv("ASTRA_DB_COLLECTION", ASTRA_DB_COLLECTION);

// ---- SDK clients ----
const genAI = new GoogleGenerativeAI(GENAI_API_KEY);
const astra = new DataAPIClient(ASTRA_TOKEN);
const db = astra.db(ASTRA_ENDPOINT, { namespace: ASTRA_NAMESPACE });

// Gemini models
const DOCUMENT_MODEL = "gemini-2.0-flash"; // fast + handles images/PDFs well
const EMBEDDING_MODEL = "text-embedding-004"; // 768-dim by default

// Text splitter (tune if you want larger/smaller chunks)
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

// ---- Helpers ----
const SUPPORTED_MIME = new Set([
  "application/pdf",
  "text/plain",
  "text/markdown",
  // We'll still try other types via Gemini, but these are the "known good".
]);

const MAX_FILE_BYTES = 20 * 1024 * 1024; // 20 MB (Gemini inlineData practical limit for PDFs)

/** Creates the Astra collection if missing, configured for 768-d vectors. */
async function ensureVectorCollection() {
  try {
    // If this throws because it exists already, we catch & ignore below.
    await db.createCollection(ASTRA_COLLECTION, {
      vector: { dimension: 768, metric: "cosine" },
      indexing: { deny: ["$vector"] }, // recommended: don't full-text index the raw vector
    } as any);
  } catch (err: any) {
    const msg = String(err?.message || err);
    // Collection may already exist – ignore that specific case.
    if (!/already exists/i.test(msg)) {
      throw err;
    }
  }
}

/** Embeds a single chunk with Gemini (returns number[]) */
async function embedChunk(text: string): Promise<number[]> {
  const model = genAI.getGenerativeModel({ model: EMBEDDING_MODEL });
  const res = await model.embedContent(text);
  return res.embedding.values;
}

/** Extracts text using Gemini if needed; otherwise decodes locally for plain text. */
async function extractTextFromFile(
  file: File,
  ab: ArrayBuffer
): Promise<string> {
  // If it's plain text/markdown, decode locally (cheaper + faster)
  if (file.type === "text/plain" || file.type === "text/markdown") {
    return new TextDecoder().decode(ab);
  }

  // Otherwise, pass the file bytes as inlineData to Gemini (works well for PDFs)
  const base64 = Buffer.from(ab).toString("base64");
  const model = genAI.getGenerativeModel({ model: DOCUMENT_MODEL });

  const generation = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text:
              "Extract ALL text from this document verbatim. " +
              "Preserve line breaks and spacing. Do NOT summarize.",
          },
          {
            inlineData: {
              data: base64,
              mimeType: file.type || "application/octet-stream",
            },
          },
        ],
      },
    ],
  });

  return generation.response.text();
}

// ---- Route handler ----
export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return new Response("No file found", { status: 400 });
    }

    // Basic file checks
    if (file.size === 0) {
      return new Response("File is empty", { status: 400 });
    }
    if (file.size > MAX_FILE_BYTES) {
      return new Response("File too large (max 20 MB)", { status: 413 });
    }

    // Read file
    const arrayBuffer = await file.arrayBuffer();

    // Create vector collection if needed
    await ensureVectorCollection();
    const collection = await db.collection(ASTRA_COLLECTION);

    // Extract text (locally for txt/md; Gemini for others like PDF)
    const documentText = await extractTextFromFile(file, arrayBuffer);

    if (!documentText?.trim()) {
      return new Response("No extractable text found in document", {
        status: 422,
      });
    }

    // Split, embed, insert
    const chunks = await splitter.splitText(documentText);

    // Optional: short-circuit for very large documents to avoid hammering APIs
    if (chunks.length > 5000) {
      return new Response(
        `Document splits into ${chunks.length} chunks; too large to process in one request.`,
        { status: 413 }
      );
    }

    // Embed + insert sequentially (you can batch or Promise.allSettled with rate limits if needed)
    let inserted = 0;
    for (const chunk of chunks) {
      const embedding = await embedChunk(chunk); // number[]
      if (!Array.isArray(embedding) || embedding.length !== 768) {
        // Defensive check: your Astra collection is created for 768 dims
        throw new Error(
          `Embedding dimension mismatch. Expected 768, got ${embedding?.length ?? "unknown"}.`
        );
      }

      await collection.insertOne({
        pageContent: chunk,
        $vector: embedding,
        metadata: {
          source: file.name,
          type: "file_upload",
          sizeBytes: file.size,
          mimeType: file.type,
          uploadedAt: new Date().toISOString(),
        },
      });

      inserted++;
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${inserted} chunks from ${file.name}`,
      chunks: inserted,
      file: file.name,
    });
  } catch (err: any) {
    // Bubble up meaningful error details to help you debug from the client
    const message = err?.message || "Document processing failed";
    console.error("Upload error:", err);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

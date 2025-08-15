import { DataAPIClient } from "@datastax/astra-db-ts";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { NextResponse } from "next/server";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
  GEMINI_API_KEY,
} = process.env;

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY!);
const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });
const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: 512,
  chunkOverlap: 100,
});

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return new Response("No file found", { status: 400 });
    }

    // Convert file to base64
    const fileData = await file.arrayBuffer();
    const base64Data = Buffer.from(fileData).toString("base64");

    // Initialize document processing model
    const documentModel = genAI.getGenerativeModel({
      model: "gemini-2.0-pro-exp",
    });

    // Extract text from document
    const extractionResult = await documentModel.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Extract ALL text from this document verbatim. Preserve exact formatting, spacing, and special characters:",
            },
            {
              inlineData: {
                data: base64Data,
                mimeType: file.type,
              },
            },
          ],
        },
      ],
    });

    const documentText = extractionResult.response.text();

    // Initialize embedding model
    const embeddingModel = genAI.getGenerativeModel({
      model: "text-embedding-004",
    });

    // Process and store chunks
    const collection = await db.collection(ASTRA_DB_COLLECTION!);
    const chunks = await splitter.splitText(documentText);

    for (const chunk of chunks) {
      const embeddingResponse = await embeddingModel.embedContent(chunk);
      const embedding = embeddingResponse.embedding.values;

      await collection.insertOne({
        pageContent: chunk,
        $vector: embedding,
        metadata: {
          source: file.name,
          type: "file_upload",
          uploadedAt: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Processed ${chunks.length} chunks from ${file.name}`,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return new Response("Document processing failed", { status: 500 });
  }
}

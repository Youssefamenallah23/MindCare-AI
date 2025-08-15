import { DataAPIClient } from "@datastax/astra-db-ts";
import { NextResponse } from "next/server";

const {
  ASTRA_DB_NAMESPACE,
  ASTRA_DB_COLLECTION,
  ASTRA_DB_ENDPOINT,
  ASTRA_DB_APPLICATION_TOKEN,
} = process.env;

const client = new DataAPIClient(ASTRA_DB_APPLICATION_TOKEN!);
const db = client.db(ASTRA_DB_ENDPOINT!, { namespace: ASTRA_DB_NAMESPACE });

export async function GET() {
  try {
    const collection = await db.collection(ASTRA_DB_COLLECTION!);
    const result = await collection
      .find(
        { "metadata.type": "file_upload" },
        { projection: { "metadata.source": 1, "metadata.uploadedAt": 1 } }
      )
      .toArray();

    const uniqueFiles = Array.from(
      new Set(result.map((doc) => doc.metadata.source))
    ).map((filename) => ({
      filename,
      uploadedAt: result.find((doc) => doc.metadata.source === filename)
        ?.metadata.uploadedAt,
    }));

    return NextResponse.json(uniqueFiles);
  } catch (error) {
    console.error("File list error:", error);
    return new Response("Failed to retrieve files", { status: 500 });
  }
}

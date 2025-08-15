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

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const filename = searchParams.get("filename");

    if (!filename) return new Response("Filename required", { status: 400 });

    const collection = await db.collection(ASTRA_DB_COLLECTION!);
    const result = await collection.deleteMany({
      "metadata.source": filename,
    });

    if (result.deletedCount === 0) {
      return new Response("File not found", { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Delete error:", error);
    return new Response("Delete failed", { status: 500 });
  }
}

// app/api/get-user-name/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export async function POST(request: Request) {
  try {
    const { clerkId } = await request.json();
    if (!clerkId) {
      return NextResponse.json({ error: "Missing clerkId" }, { status: 400 });
    }

    const client = createClient({
      projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!,
      dataset: process.env.NEXT_PUBLIC_SANITY_DATASET!,
      token: process.env.SANITY_API_TOKEN, // use a server-only token
      useCdn: false,
      apiVersion: "2024-03-11",
    });

    // Query for the user document by clerkId
    const query = `*[_type == "users" && clerkId == $clerkId][0]{ firstName, lastName }`;
    const result = await client.fetch<{
      firstName?: string;
      lastName?: string;
    } | null>(query, { clerkId });

    if (!result) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    return NextResponse.json({
      firstName: result.firstName || "",
      lastName: result.lastName || "",
    });
  } catch (err: any) {
    console.error("Error in get-user-name:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

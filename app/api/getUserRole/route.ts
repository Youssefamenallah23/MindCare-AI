// app/api/getUserRole/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { getAuth } from "@clerk/nextjs/server"; // Use server-side auth

// --- WARNING: Client-side Sanity Client Initialization ---
// Using NEXT_PUBLIC_ variables here. The token used MUST have read permissions.
// Exposing tokens client-side has security implications if dataset isn't public.
// Consider using a server-only token and shared client (lib/sanityClient.ts) instead.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN; // Read permissions needed

if (!projectId || !dataset) {
  console.error(
    "API getUserRole: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET"
  );
}

const sanityClient = createClient({
  projectId: projectId || "missing_project_id",
  dataset: dataset || "missing_dataset",
  token: token,
  useCdn: !token, // Use CDN only if public dataset and no token
  apiVersion: "2024-03-11",
});
// --- End Sanity Client Initialization ---

export async function GET(request: NextRequest) {
  // Check for essential config first
  if (!projectId || !dataset) {
    return NextResponse.json(
      { error: "Server configuration error: Sanity client details missing." },
      { status: 500 }
    );
  }

  try {
    // 1. Authenticate the request using Clerk session
    // This gets the ID of the user making the request from their session cookie/token
    const { userId: clerkUserId } = getAuth(request);

    if (!clerkUserId) {
      // User is not logged in
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch the user's role from Sanity based on their Clerk ID
    const query = `*[_type == "users" && clerkId == $clerkId][0]{ role }`;
    const params = { clerkId: clerkUserId };

    const userData = await sanityClient.fetch<{ role: string } | null>(
      query,
      params
    );

    // 3. Handle user not found in Sanity or role missing
    if (!userData || !userData.role) {
      console.warn(
        `API getUserRole: Role not found for Clerk ID: ${clerkUserId}. Defaulting to 'user'.`
      );
      // Return a default role or a specific status if preferred
      return NextResponse.json({ role: "user" }); // Default to 'user' if not found or no role assigned
      // Or return an error:
      // return NextResponse.json({ error: "User role not found" }, { status: 404 });
    }

    // 4. Return the fetched role
    return NextResponse.json({ role: userData.role });
  } catch (error: any) {
    console.error("API Error fetching user role:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.responseBody || error.message || "Internal Server Error";
    return NextResponse.json(
      { error: "Failed to fetch user role", details: errorMessage },
      { status: statusCode }
    );
  }
}

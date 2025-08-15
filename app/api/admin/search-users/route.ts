// app/api/admin/search-users/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client"; // Direct import

// --- WARNING: Client-side Sanity Client Initialization ---
// Using NEXT_PUBLIC_ variables here. The token used MUST have at least read permissions.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN; // Read permissions needed

if (!projectId || !dataset) {
  console.error(
    "API search-users: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET"
  );
}

const sanityClient = createClient({
  projectId: projectId || "missing_project_id",
  dataset: dataset || "missing_dataset",
  token: token,
  useCdn: !token,
  apiVersion: "2024-03-11",
});
// --- End Sanity Client Initialization ---

// Helper function (ensure this is accessible or defined in each route)
async function isAdmin(clerkUserId: string): Promise<boolean> {
  if (!clerkUserId) return false;
  try {
    const user = await sanityClient.fetch<{ role: string } | null>(
      `*[_type == "users" && clerkId == $clerkId][0]{ role }`,
      { clerkId: clerkUserId }
    );
    return user?.role === "admin";
  } catch (error) {
    console.error("isAdmin check failed:", error);
    return false;
  }
}

// Interface for expected user data to return (ADDED lastActivityTimestamp)
interface SearchedUser {
  _id: string;
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
  profileImage?: string;
  lastActivityTimestamp?: string; // ISO String or null
}

export async function GET(request: NextRequest) {
  // Check for essential config first
  if (!projectId || !dataset) {
    return NextResponse.json(
      { error: "Server configuration error: Sanity client details missing." },
      { status: 500 }
    );
  }

  try {
    // 1. Authenticate and Authorize Admin
    const { userId: callerClerkId } = getAuth(request);
    if (!callerClerkId || !(await isAdmin(callerClerkId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Get search parameters
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type");

    if (!query || !type || (type !== "email" && type !== "clerkId")) {
      return NextResponse.json(
        { error: "Missing or invalid query parameters (query, type)" },
        { status: 400 }
      );
    }

    // 3. Build Sanity Query based on type (MODIFIED to include subquery)
    let sanityQuery = "";
    const params: { [key: string]: string } = { query };

    const userProjection = `{
        _id,
        clerkId,
        email,
        username,
        firstName,
        lastName,
        role,
        profileImage,
        "lastActivityTimestamp": *[_type == "sentimentAnalysis" && references(^._id) ] | order(timestamp desc)[0].timestamp
    }`; // Added subquery for last timestamp

    if (type === "email") {
      sanityQuery = `*[_type == "users" && email == $query]${userProjection}`;
    } else {
      // type === 'clerkId'
      sanityQuery = `*[_type == "users" && clerkId == $query]${userProjection}`;
    }

    // 4. Fetch users from Sanity
    const users = await sanityClient.fetch<SearchedUser[] | null>(
      sanityQuery,
      params
    );

    // 5. Return results
    return NextResponse.json(users ?? []);
  } catch (error: any) {
    console.error("API Error searching users:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.responseBody || error.message || "Internal Server Error";
    return NextResponse.json(
      { error: "Failed to search users", details: errorMessage },
      { status: statusCode }
    );
  }
}

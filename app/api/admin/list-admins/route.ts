// app/api/admin/list-admins/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client"; // Direct import

// --- WARNING: Client-side Sanity Client Initialization ---
// Using NEXT_PUBLIC_ variables here. The token used MUST have at least read permissions.
// Exposing tokens client-side has security implications.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN; // Read permissions needed

if (!projectId || !dataset) {
  console.error(
    "API list-admins: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET"
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

// Interface for expected admin user data
interface AdminUser {
  _id: string;
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
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
    // 1. Authenticate the request using Clerk session
    const { userId: callerClerkId } = getAuth(request);
    if (!callerClerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Authorize: Check if the CALLER is an admin
    try {
      const callerUser = await sanityClient.fetch<{ role: string } | null>(
        `*[_type == "users" && clerkId == $clerkId][0]{ role }`,
        { clerkId: callerClerkId } // Pass parameter
      );
      if (callerUser?.role !== "admin") {
        console.warn(
          `User ${callerClerkId} attempted list admins without admin role.`
        );
        return NextResponse.json(
          { error: "Forbidden: Admin privileges required." },
          { status: 403 }
        );
      }
    } catch (authError: any) {
      console.error("Error checking caller admin status:", authError);
      return NextResponse.json(
        { error: "Failed to verify authorization", details: authError.message },
        { status: 500 }
      );
    }

    // 3. Fetch all users with role 'admin'
    // This query doesn't need parameters
    const query = `*[_type == "users" && role == "admin"] | order(username asc) {
        _id, clerkId, email, username, firstName, lastName, role
    }`;
    const admins = await sanityClient.fetch<AdminUser[] | null>(query);

    // 4. Return results
    return NextResponse.json(admins ?? []); // Return empty array if fetch returns null
  } catch (error: any) {
    console.error("API Error listing admins:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.responseBody || error.message || "Internal Server Error";
    return NextResponse.json(
      { error: "Failed to list admins", details: errorMessage },
      { status: statusCode }
    );
  }
}

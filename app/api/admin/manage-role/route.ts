// app/api/admin/manage-role/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client"; // Direct import

// --- WARNING: Client-side Sanity Client Initialization ---
// Using NEXT_PUBLIC_ variables here. The token used MUST have write permissions
// for this route to work. Exposing write tokens to the client is a security risk.
// Consider using a server-only token and shared client (lib/sanityClient.ts) instead.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN; // Needs write permissions!

if (!projectId || !dataset) {
  console.error(
    "API manage-role: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET"
  );
  // Return a 500 error immediately if config is missing
  // Note: Can't return NextResponse directly at top level, handle inside POST
}
if (!token) {
  console.error(
    "API manage-role: Missing NEXT_PUBLIC_SANITY_API_TOKEN. Write operations will fail."
  );
  // Handle inside POST
}

const sanityClient = createClient({
  projectId: projectId || "missing_project_id",
  dataset: dataset || "missing_dataset",
  token: token, // Use the potentially insecurely exposed token
  useCdn: false, // Must be false for authenticated requests/mutations
  apiVersion: "2024-03-11", // Use your desired API version
});
// --- End Sanity Client Initialization ---

// Interface for expected request body
interface ManageRolePayload {
  targetUserId: string; // The Sanity _id of the user to modify
  makeAdmin: boolean; // true to grant admin, false to revoke
}

export async function POST(request: NextRequest) {
  // Check for essential config first
  if (!projectId || !dataset || !token) {
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
        { clerkId: callerClerkId }
      );
      if (callerUser?.role !== "admin") {
        console.warn(
          `User ${callerClerkId} attempted admin action without admin role.`
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

    // 3. Parse request body
    let payload: ManageRolePayload;
    try {
      payload = (await request.json()) as ManageRolePayload;
      if (
        !payload ||
        typeof payload !== "object" ||
        !payload.targetUserId ||
        typeof payload.makeAdmin !== "boolean"
      ) {
        throw new Error(
          "Invalid request body. Required: targetUserId (string), makeAdmin (boolean)"
        );
      }
    } catch (parseError) {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    const { targetUserId, makeAdmin } = payload;
    const newRole = makeAdmin ? "admin" : "user";

    // 4. Safety Check: Prevent removing the last admin / self-revoke
    if (!makeAdmin) {
      // Fetch target user info, passing the parameter
      const targetUser = await sanityClient.fetch<{
        _id: string;
        clerkId: string;
        role: string;
      } | null>(
        `*[_type == "users" && _id == $targetUserId][0]{_id, clerkId, role}`,
        { targetUserId } // Pass parameter correctly
      );

      if (!targetUser) {
        return NextResponse.json(
          { error: "Target user not found." },
          { status: 404 }
        );
      }
      if (targetUser.clerkId === callerClerkId) {
        return NextResponse.json(
          { error: "Admins cannot revoke their own role via this method." },
          { status: 400 }
        );
      }
      if (targetUser.role === "admin") {
        const adminCount = await sanityClient.fetch<number>(
          `count(*[_type == "users" && role == "admin"])`
        );
        // Ensure adminCount is a number before comparing
        if (typeof adminCount === "number" && adminCount <= 1) {
          return NextResponse.json(
            { error: "Cannot remove the last admin." },
            { status: 400 }
          );
        }
      }
    }
    // End Safety Check

    // 5. Patch the target user's role
    await sanityClient
      .patch(targetUserId)
      .set({ role: newRole, updatedAt: new Date().toISOString() })
      .commit({ autoGenerateArrayKeys: false });

    console.log(
      `Admin ${callerClerkId} set role for user ${targetUserId} to ${newRole}`
    );

    // 6. Return Success
    return NextResponse.json({ message: `User role updated to ${newRole}` });
  } catch (error: any) {
    console.error("API Error managing role:", error);
    const statusCode = error.statusCode || 500; // Use Sanity error status code if available
    const errorMessage =
      error.responseBody || error.message || "Internal Server Error";
    // Avoid leaking detailed internal errors in production if desired
    return NextResponse.json(
      { error: "Failed to update role", details: errorMessage },
      { status: statusCode }
    );
  }
}

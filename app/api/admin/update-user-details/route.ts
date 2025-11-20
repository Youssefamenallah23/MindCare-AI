// app/api/admin/update-user-details/route.ts
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
}); // Use server-side client with write token

// Helper function to check if the caller is an admin
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

// Interface for expected updatable fields in the payload
interface UpdatePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
  // Add other fields admins can edit here
}

// Interface for the request body
interface UpdateRequestBody {
  targetUserId: string; // Sanity document _id of the user to update
  updates: UpdatePayload;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate and Authorize Admin
    const { userId: callerClerkId } = getAuth(request);
    if (!callerClerkId || !(await isAdmin(callerClerkId))) {
      return NextResponse.json(
        { error: "Unauthorized: Admin privileges required." },
        { status: 403 }
      );
    }

    // 2. Parse request body
    const payload = (await request.json()) as UpdateRequestBody;
    if (
      !payload ||
      typeof payload !== "object" ||
      !payload.targetUserId ||
      !payload.updates ||
      typeof payload.updates !== "object"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid request body. Required: targetUserId (string), updates (object)",
        },
        { status: 400 }
      );
    }

    const { targetUserId, updates } = payload;

    // 3. Prepare fields for patching (only include valid fields)
    const fieldsToUpdate: Partial<UpdatePayload> & { updatedAt: string } = {
      updatedAt: new Date().toISOString(),
    };
    if (updates.firstName !== undefined)
      fieldsToUpdate.firstName = updates.firstName;
    if (updates.lastName !== undefined)
      fieldsToUpdate.lastName = updates.lastName;
    if (updates.username !== undefined)
      fieldsToUpdate.username = updates.username; // Consider uniqueness validation if needed
    if (updates.profileImage !== undefined)
      fieldsToUpdate.profileImage = updates.profileImage;

    // Check if there are any fields to update besides timestamp
    if (Object.keys(fieldsToUpdate).length <= 1) {
      return NextResponse.json(
        { error: "No valid fields provided for update." },
        { status: 400 }
      );
    }

    // 4. Patch the Sanity Document
    // We assume targetUserId is valid; Sanity patch will fail if it doesn't exist.
    await sanityClient
      .patch(targetUserId)
      .set(fieldsToUpdate)
      .commit({ autoGenerateArrayKeys: false });

    // 5. Return Success Response
    // Optionally return the updated user data
    return NextResponse.json({ message: "User profile updated successfully" });
  } catch (error: any) {
    console.error("API Error updating user details:", error);
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.responseBody || error.message || "Internal Server Error";
    return NextResponse.json(
      { error: "Failed to update user profile", details: errorMessage },
      { status: statusCode }
    );
  }
}

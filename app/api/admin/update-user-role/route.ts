import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client";

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

import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { clerkId, newRole } = await request.json();

    // Verify caller is admin
    const { userId: callerClerkId } = getAuth(request);
    const caller = await sanityClient.fetch(
      `*[_type == "users" && clerkId == $clerkId][0]{ role }`,
      { clerkId: callerClerkId }
    );

    if (!caller || caller.role !== "admin") {
      return NextResponse.json(
        { error: "Admin privileges required" },
        { status: 403 }
      );
    }

    // Find target user by clerkId
    const targetUser = await sanityClient.fetch(
      `*[_type == "users" && clerkId == $clerkId][0]{ _id }`,
      { clerkId }
    );

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Update role
    await sanityClient.patch(targetUser._id).set({ role: newRole }).commit();

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Update error:", error);
    return NextResponse.json(
      { error: error.message || "Update failed" },
      { status: 500 }
    );
  }
}

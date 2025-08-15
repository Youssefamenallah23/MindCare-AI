// app/api/update-task-status/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@sanity/client";
import { getAuth } from "@clerk/nextjs/server";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Use your shared client

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate the user
    const { userId: clerkUserId } = getAuth(request);
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Get data from the request body
    const { routineId, taskKey, completed } = await request.json();

    // Basic validation
    if (!routineId || !taskKey || typeof completed !== "boolean") {
      return NextResponse.json(
        { error: "Missing required fields: routineId, taskKey, completed" },
        { status: 400 }
      );
    }

    // 3. **Important Security Check (Optional but Recommended):**
    //    Verify that the routine document actually belongs to the logged-in user.
    //    This prevents a user from potentially updating tasks on someone else's routine
    //    if they guess the routineId and taskKey.
    const routineCheck = await sanityClient.fetch<string | null>(
      `*[_type == "routines" && _id == $routineId && user._ref in *[_type=="users" && clerkId==$clerkUserId]._id][0]._id`,
      { routineId, clerkUserId }
    );

    if (!routineCheck) {
      // If routineCheck is null, the routine doesn't exist or doesn't belong to this user
      console.warn(
        `User ${clerkUserId} attempted to update task on routine ${routineId} they don't own or which doesn't exist.`
      );
      return NextResponse.json(
        { error: "Forbidden or Routine Not Found" },
        { status: 403 }
      ); // Or 404
    }
    // End Optional Security Check

    // 4. Perform the Sanity Patch operation
    console.log(
      `Patching routine ${routineId}, task ${taskKey} to completed: ${completed}`
    );
    await sanityClient
      .patch(routineId) // Document ID to patch
      .set({ [`tasks[_key=="${taskKey}"].completed`]: completed }) // Set the completed field of the specific task item
      .commit({
        // Options if needed, like visibility or autoGenerateArrayKeys
        // autoGenerateArrayKeys: false // Usually recommended for patches within arrays
      });

    // 5. Return success response
    return NextResponse.json({ message: "Task status updated successfully" });
  } catch (error: any) {
    console.error("Error updating task status:", error);
    // Log the error details on the server
    return NextResponse.json(
      { error: "Internal Server Error updating task", details: error.message },
      { status: 500 }
    );
  }
}

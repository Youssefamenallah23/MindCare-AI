// app/api/check-or-generate-daily-routine/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client"; // Import shared Sanity client

// No AI-related imports or initializations needed anymore

// No helper functions for AI prompt or parsing needed
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
});

// --- API Route Handler (POST) ---
export async function POST(request: NextRequest) {
  try {
    // --- 1. Authentication ---
    const { userId: clerkUserId } = getAuth(request);
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0]; // Format as YYYY-MM-DD

    // --- 2. Find Sanity User ---
    // Fetch only the _id as that's all needed for the reference check
    const sanityUser = await sanityClient.fetch<{ _id: string }>(
      `*[_type == "users" && clerkId == $clerkUserId][0]{ _id }`,
      { clerkUserId }
    );

    if (!sanityUser) {
      console.warn(
        `Check routine failed: No Sanity user found for Clerk ID: ${clerkUserId}`
      );
      return NextResponse.json(
        { error: "User not found in internal records" },
        { status: 404 }
      );
    }
    const sanityUserId = sanityUser._id; // The Sanity document ID for the user

    // --- 3. Check if a routine exists for today ---
    // Query the 'routines' documents.
    // Check if the 'user' field in a routine document references our found user's ID (_ref).
    // Also check if the 'routineDate' matches today's date string.
    // Fetch the first one found ([0]).
    const existingRoutine = await sanityClient.fetch<any>( // Use 'any' or define a specific type for Routine
      `*[_type == "routines" && user._ref == $sanityUserId && routineDate == $todayDateString][0]`,
      {
        sanityUserId: sanityUserId, // Pass the Sanity document _id as the parameter
        todayDateString: todayDateString,
      }
    );

    // --- 4. Return Result ---
    if (existingRoutine) {
      // Routine FOUND for today
      console.log(
        `Daily routine found for user ${sanityUserId} on ${todayDateString}`
      );
      return NextResponse.json(
        {
          message: "Routine already exists for today.",
          routineExists: true,
          routine: existingRoutine, // Send the found routine data back
        },
        { status: 200 }
      );
    } else {
      // Routine NOT FOUND for today
      console.log(
        `No daily routine found for user ${sanityUserId} on ${todayDateString}`
      );
      return NextResponse.json(
        {
          message: "No routine found for today.",
          routineExists: false,
          routine: null, // Explicitly send null for routine data
        },
        { status: 200 }
      ); // It's still a successful check, just nothing found
    }
  } catch (error: any) {
    // --- Top-Level Error Handling ---
    const clerkIdForError = (request as any)?.auth?.userId || "unknown"; // Attempt to get clerkId for logging
    console.error(
      `Error in /api/check-or-generate-daily-routine for user ${clerkIdForError}:`,
      error
    );
    return NextResponse.json(
      {
        error: "Internal Server Error checking for routine",
        details: error.message,
      },
      { status: 500 }
    );
  }
}

// app/api/update-user-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Adjust import path if needed// Use server-side client with write token

// Interface for expected updatable fields
interface UpdateProfilePayload {
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string; // Expecting a URL string
  // Add other editable fields here if needed, e.g., tags: string[]
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId: clerkUserId } = getAuth(request);
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse Body
    const payload = (await request.json()) as UpdateProfilePayload;
    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // 3. Find the Sanity User Document ID --- *** FIX IS HERE *** ---
    const sanityUser = await sanityClient.fetch<{ _id: string } | null>( // Allow null result
      `*[_type == "users" && clerkId == $clerkId][0]{ _id }`,
      { clerkId: clerkUserId } // Pass the clerkId as a parameter
    );

    if (!sanityUser?._id) {
      console.warn(
        `Update profile failed: No Sanity user found for Clerk ID: ${clerkUserId}.`
      );
      return NextResponse.json(
        { error: "User profile not found" },
        { status: 404 }
      );
    }
    const userDocumentId = sanityUser._id;
    // --- *** END FIX *** ---

    // 4. Prepare the fields to update
    const fieldsToUpdate: Partial<UpdateProfilePayload> & {
      updatedAt: string;
    } = {
      updatedAt: new Date().toISOString(),
    };
    if (payload.firstName !== undefined)
      fieldsToUpdate.firstName = payload.firstName;
    if (payload.lastName !== undefined)
      fieldsToUpdate.lastName = payload.lastName;
    if (payload.username !== undefined)
      fieldsToUpdate.username = payload.username;
    if (payload.profileImage !== undefined) fieldsToUpdate.profileImage = "";

    // 5. Patch the Sanity Document
    await sanityClient
      .patch(userDocumentId)
      .set(fieldsToUpdate)
      .commit({ autoGenerateArrayKeys: false });

    console.log(
      `User profile updated successfully for Sanity document ID: ${userDocumentId}`
    );

    // 6. Return Success Response
    return NextResponse.json({ message: "Profile updated successfully" });
  } catch (error: any) {
    console.error("API Error updating user profile:", error);
    // Check if it's a Sanity client error and extract details if needed
    const statusCode = error.statusCode || 500;
    const errorMessage =
      error.responseBody ||
      error.message ||
      "Internal Server Error updating profile";
    // Avoid sending back raw internal errors directly in production
    return NextResponse.json(
      { error: "Failed to update profile", details: errorMessage }, // Provide generic error
      { status: statusCode }
    );
  }
}

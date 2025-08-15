// app/api/get-user-profile/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Adjust import path if needed // Import your SERVER-SIDE configured client

// Define the expected structure for clarity
interface SanityUserProfileData {
  _id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  role: string;
  profileImage?: string;
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate the request using Clerk session
    const { userId: clerkUserId } = getAuth(request);
    if (!clerkUserId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Fetch user data from Sanity using the clerkId
    // Use the secure, server-side sanityClient
    const query = `*[_type == "users" && clerkId == $clerkId][0] {
        _id,
        firstName,
        lastName,
        username,
        role,
        profileImage
      }`;
    const params = { clerkId: clerkUserId };
    const userData = await sanityClient.fetch<SanityUserProfileData | null>(
      query,
      params
    );

    // 3. Handle user not found in Sanity
    if (!userData) {
      console.warn(
        `API: No Sanity user profile found for Clerk ID: ${clerkUserId}.`
      );
      // Return 404 Not Found
      return NextResponse.json(
        { error: "User profile not found in database" },
        { status: 404 }
      );
    }

    // 4. Return the fetched user data
    return NextResponse.json(userData);
  } catch (error: any) {
    console.error("API Error fetching user profile:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

// app/api/users/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

export async function POST(request: Request) {
  // Create Sanity client directly in the route
  const sanityClient = createClient({
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET,
    token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
    useCdn: false,
  });

  try {
    const userData = await request.json();

    // Validate required fields
    if (!userData.clerkId || !userData.email) {
      return NextResponse.json(
        { error: "Missing required fields: clerkId and email" },
        { status: 400 }
      );
    }

    // Create user document
    const result = await sanityClient.create({
      _type: "users",
      clerkId: userData.clerkId,
      email: userData.email,
      username: userData.username || userData.email.split("@")[0],
      firstName: userData.firstName,
      lastName: userData.lastName,
      role: "user",
      profileImage: userData.profileImage || "",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: [],
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    console.error("Sanity error:", error);
    return NextResponse.json(
      {
        error: error.message || "Failed to create user",
        details: error.details || null,
      },
      { status: 500 }
    );
  }
}

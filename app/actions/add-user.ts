"use server";

import { client } from "@/sanity/lib/client";

export async function addUserToSanity(userData: {
  clerkId: string;
  email: string;
  username: string;
  firstName: string | null;
  lastName: string | null;
  profileImage: string;
}) {
  try {
    // Check if the user already exists in Sanity
    const existingUser = await client.fetch(
      `*[_type == "user" && clerkId == $clerkId][0]`,
      { clerkId: userData.clerkId }
    );

    if (existingUser) {
      console.log("User already exists in Sanity");
      return;
    }

    // Create a new user document in Sanity
    const userDoc = {
      _type: "user",
      clerkId: userData.clerkId,
      email: userData.email,
      username: userData.username,
      firstName: userData.firstName,
      lastName: userData.lastName,
      profileImage: userData.profileImage,
      role: "user",
      tags: [],
    };

    await client.create(userDoc);
    console.log("User added to Sanity:", userDoc);
  } catch (error) {
    console.error("Error adding user to Sanity:", error);
    throw error;
  }
}

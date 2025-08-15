import { client } from "./client";

export async function getUserRoleByClerkId(
  clerkId: string
): Promise<string | null> {
  // Return type adjusted
  try {
    // Fetch returns an array of matching documents
    const result = await client.fetch<{ role: string }[]>( // Type the expected result
      `*[_type == "users" && clerkId == $clerkId] {
        role // Only ask for the role field
      }`,
      { clerkId }
    );

    // If a user is found, return their role, otherwise return null
    // Sanity fetch returns an array, even for a single expected result
    if (result && result.length > 0) {
      return result[0].role;
    } else {
      return null; // No user found with that clerkId
    }
  } catch (error) {
    console.error("Error fetching user role by Clerk ID:", error);
    return null; // Return null on error
  }
}

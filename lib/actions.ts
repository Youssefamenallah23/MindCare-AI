"use server";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createClerkClient } from "@clerk/backend"; // Correct import

const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });

export async function signIn({
  email,
  password,
}: {
  email: string;
  password?: string;
}) {
  try {
    await auth().signIn({ identifier: email, password });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.errors[0].message };
  }
}

export async function signUp({
  email,
  password,
  firstName,
  lastName,
}: {
  email: string;
  password?: string;
  firstName?: string;
  lastName?: string;
}) {
  try {
    await clerk.users.createUser({
      emailAddresses: [{ emailAddress: email }],
      password,
      firstName,
      lastName,
    });
    revalidatePath("/");
    return { success: true };
  } catch (error: any) {
    return { error: error.errors[0].message };
  }
}

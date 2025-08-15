// app/api/change-password/route.ts
import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { Clerk } from "@clerk/clerk-sdk-node";

// Initialize Clerk server‐side client with your API key
const clerkClient = new Clerk({
  apiKey: process.env.CLERK_API_KEY!,
  apiVersion: "2024-06-01",
});

export async function POST(request: Request) {
  try {
    // 1. Authenticate the request
    const { userId, sessionId } = auth();
    if (!userId || !sessionId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // 2. Parse body
    const { currentPassword, newPassword } = await request.json();
    if (!currentPassword || !newPassword) {
      return NextResponse.json(
        { error: "Missing current or new password" },
        { status: 400 }
      );
    }

    // 3. Load the user to find their primary email
    const user = await clerkClient.users.getUser(userId);
    const primaryEmail = user.emailAddresses.find(
      (e) => e.id === user.primaryEmailAddressId
    )?.emailAddress;
    if (!primaryEmail) {
      return NextResponse.json(
        { error: "Could not retrieve your email address" },
        { status: 500 }
      );
    }

    // 4. Re-authenticate: attempt sign-in with current password
    const signInAttempt = await clerkClient.signIn.create({
      identifier: primaryEmail,
      password: currentPassword,
    });
    if (signInAttempt.status !== "complete") {
      return NextResponse.json(
        { error: "Current password is incorrect" },
        { status: 403 }
      );
    }

    // 5. Update to the new password
    await clerkClient.users.updateUser(userId, { password: newPassword });

    // 6. Revoke all sessions so the user must sign in again
    await clerkClient.sessions.revokeAllSessions(userId);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("change-password error:", err);
    return NextResponse.json(
      { error: err.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

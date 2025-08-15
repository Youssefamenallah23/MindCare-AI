// app/api/admin/stats/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client"; // Direct import
import { subMonths, format, subDays } from "date-fns";
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
}); // Use server-side client
// app/api/admin/stats/route.ts

// Helper function to check if the caller is an admin (can be shared)
async function isAdmin(clerkUserId: string): Promise<boolean> {
  if (!clerkUserId) return false;
  try {
    const user = await sanityClient.fetch<{ role: string } | null>(
      `*[_type == "users" && clerkId == $clerkId][0]{ role }`,
      { clerkId: clerkUserId }
    );
    return user?.role === "admin";
  } catch (error) {
    console.error("isAdmin check failed:", error);
    return false;
  }
}

// Updated stats interface
interface AdminStats {
  totalUsers: number;
  totalRoutines: number;
  analysesLastMonth: number;
  newUsersLast7Days: number; // New stat
  totalTasksAssigned: number; // New stat
}

export async function GET(request: NextRequest) {
  try {
    // 1. Authenticate and Authorize Admin
    const { userId: callerClerkId } = getAuth(request);
    if (!callerClerkId || !(await isAdmin(callerClerkId))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 2. Prepare dates
    const oneMonthAgoISO = format(
      subMonths(new Date(), 1),
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    );
    const sevenDaysAgoISO = format(
      subDays(new Date(), 7),
      "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'"
    );

    // 3. Fetch stats using GROQ count()
    // Use _createdAt for user creation date comparison
    const statsQuery = `{
        "totalUsers": count(*[_type == "users"]),
        "totalRoutines": count(*[_type == "routines"]),
        "analysesLastMonth": count(*[_type == "sentimentAnalysis" && timestamp >= $oneMonthAgo]),
        "totalTasksAssigned": count(*[_type == "routines"].tasks[])
    }`;

    const params = {
      oneMonthAgo: oneMonthAgoISO,
      sevenDaysAgo: sevenDaysAgoISO,
    };

    // Fetch returns the object directly based on the query structure
    const stats: AdminStats = await sanityClient.fetch(statsQuery, params);

    // 4. Return stats
    return NextResponse.json(stats);
  } catch (error: any) {
    console.error("API Error fetching admin stats:", error);
    return NextResponse.json(
      { error: "Internal Server Error fetching stats", details: error.message },
      { status: 500 }
    );
  }
}

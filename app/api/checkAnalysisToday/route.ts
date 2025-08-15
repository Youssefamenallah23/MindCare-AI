// In your Next.js API routes (e.g., pages/api/checkAnalysisToday.ts or app/api/checkAnalysisToday/route.ts)

import { NextResponse } from "next/server";
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get("userId");

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const query = `
        *[_type == 'sentimentAnalysis' &&
          user._ref == $userId &&
          _createdAt >= $todayStart &&
          _createdAt <= $todayEnd
        ][0]
    `;

  try {
    const existingAnalysis = await sanityClient.fetch(query, {
      userId,
      todayStart: todayStart.toISOString(),
      todayEnd: todayEnd.toISOString(),
    });

    return NextResponse.json({ analysisDone: !!existingAnalysis });
  } catch (error) {
    console.error("Error checking for today's analysis:", error);
    return NextResponse.json(
      { error: "Failed to check analysis status" },
      { status: 500 }
    );
  }
}

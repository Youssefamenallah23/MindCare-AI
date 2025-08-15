// app/api/save-confirmed-routine/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Use your shared client
// --- NEW: Enhanced Task Parser ---
interface ParsedTask {
  dayIndex: number;
  description: string;
}

function parseMultiDayTasks(
  content: string
): Array<{
  _type: string;
  dayIndex: number;
  description: string;
  completed: boolean;
}> {
  const tasks: Array<{
    _type: string;
    dayIndex: number;
    description: string;
    completed: boolean;
  }> = [];
  const lines = content
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  let currentDayIndex = 0;

  const dayHeaderRegex = /^\*\*Day\s*(\d+):\*\*/i; // Matches "Day X:" (case-insensitive)

  for (const line of lines) {
    const dayMatch = line.match(dayHeaderRegex);
    if (dayMatch && dayMatch[1]) {
      // Found a day header, update current day index
      currentDayIndex = parseInt(dayMatch[1], 10);
    } else if (
      currentDayIndex > 0 &&
      (line.startsWith("*") || line.startsWith("-"))
    ) {
      // Found a task line after a day header
      const description = line.replace(/^[\*\-\•]\s*/, "").trim();
      if (description) {
        tasks.push({
          _type: "taskItem",
          dayIndex: currentDayIndex, // Assign the current day index
          description: description,
          completed: false, // Default to not completed
        });
      }
    }
    // Ignore lines that aren't day headers or task items following a header
  }

  return tasks;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Auth & User Lookup (keep as before)
    const { userId: clerkUserId } = getAuth(request);
    if (!clerkUserId)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sanityUser = await sanityClient.fetch<{ _id: string }>(
      `*[_type == "users" && clerkId == $clerkUserId][0]{ _id }`,
      { clerkUserId }
    );
    if (!sanityUser)
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    const sanityUserId = sanityUser._id;
    const userRef = { _type: "reference", _ref: sanityUserId };

    // 2. Get Data & Validate (keep as before, duration is important)
    let routineContent: string;
    let duration: number;
    try {
      const body = await request.json();
      routineContent = body.routineContent;
      duration = parseInt(body.duration, 10);
      if (!routineContent) throw new Error("Missing routineContent");
      if (isNaN(duration) || duration < 1) duration = 1; // Default duration
    } catch (e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const today = new Date();
    const todayDateString = today.toISOString().split("T")[0];

    // 3. DUPLICATE CHECK (keep as before)
    const existingRoutineCheck = await sanityClient.fetch<string | null>(
      `*[_type == "routines" && user._ref == $sanityUserId && routineDate == $todayDateString][0]._id`,
      { sanityUserId, todayDateString }
    );
    if (existingRoutineCheck) {
      return NextResponse.json(
        { message: "Routine already exists for today.", routineExists: true },
        { status: 200 }
      );
    }

    // 4. Parse Tasks using the NEW parser
    const tasks = parseMultiDayTasks(routineContent);
    if (tasks.length === 0) {
      console.warn(
        "No tasks parsed from multi-day content for user:",
        sanityUserId
      );
      return NextResponse.json(
        { error: "No valid tasks could be parsed from the routine content" },
        { status: 400 }
      );
    }

    // 5. Prepare Sanity Document (includes duration and parsed tasks with dayIndex)
    const newRoutineDocument = {
      _type: "routines",
      user: userRef,
      routineDate: todayDateString, // Start date
      tasks: tasks,
      duration: duration,
      generatedAt: today.toISOString(),
    };

    // 6. Create Document (keep as before)
    const createdRoutine = await sanityClient.create(newRoutineDocument);
    console.log(
      `Saved multi-day routine ${createdRoutine._id} for user ${sanityUserId} duration ${duration}`
    );

    // 7. Return Success (keep as before)
    return NextResponse.json(
      {
        message: "Routine saved successfully.",
        routineExists: false,
        routineId: createdRoutine._id,
      },
      { status: 201 }
    );
  } catch (error: any) {
    // Error Handling (keep as before)
    console.error("Error saving confirmed routine:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 }
    );
  }
}

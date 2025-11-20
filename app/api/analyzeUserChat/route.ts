// app/api/analyzeUserChat/route.ts

import { NextResponse } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient, type SanityClient } from "@sanity/client"; // Import SanityClient type

// --- Environment Variable Checks ---
const geminiApiKey = process.env.GEMINI_API_KEY;
const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID; // Keep NEXT_PUBLIC_ if used elsewhere, but be mindful
const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET; // Keep NEXT_PUBLIC_ if used elsewhere, but be mindful
const sanityApiToken = process.env.NEXT_PUBLIC_SANITY_API_TOKEN; // Use a server-side only token

if (!geminiApiKey) {
  console.error("Missing environment variable: GEMINI_API_KEY");
  // Optionally throw an error during build/startup if critical
}
if (!sanityProjectId || !sanityDataset || !sanityApiToken) {
  console.error(
    "Missing one or more Sanity environment variables: NEXT_PUBLIC_SANITY_PROJECT_ID, NEXT_PUBLIC_SANITY_DATASET, SANITY_API_TOKEN"
  );
  // Optionally throw an error during build/startup if critical
}
// --- End Environment Variable Checks ---

// Initialize Gemini AI Client
const genAI = geminiApiKey ? new GoogleGenerativeAI(geminiApiKey) : null; // Handle case where key might be missing

// Initialize Sanity Client
// Ensure you have SANITY_API_TOKEN set in your server environment variables
const sanityClient: SanityClient = createClient({
  projectId: sanityProjectId || "missing_project_id", // Provide fallback or ensure check prevents this
  dataset: sanityDataset || "missing_dataset", // Provide fallback or ensure check prevents this
  token: sanityApiToken, // Use the server-side token
  useCdn: false, // `false` for mutations using the token
  apiVersion: "2024-03-11", // Use a recent API version or your project's version
});

interface AnalysisData {
  emotionalState: string;
  keyTopics: string[];
  notablePatterns: string[];
}

function extractAnalysisData(analysis: string | undefined): AnalysisData {
  const defaultResult: AnalysisData = {
    emotionalState: "Could not determine",
    keyTopics: [],
    notablePatterns: [],
  };

  if (!analysis) {
    return defaultResult;
  }

  let emotionalState = defaultResult.emotionalState;
  let keyTopics: string[] = [];
  let notablePatterns: string[] = [];

  try {
    // Extract emotional state
    // Regex: Looks for "Emotional State:", optional whitespace/newlines, then "* " followed by the state on the same line.
    const emotionalStateMatch = analysis.match(
      /Emotional State:\s*\n?\s*\*\s*(.*)/i // Added 'i' for case-insensitivity, allow optional newline
    );
    if (emotionalStateMatch?.[1]) {
      // Use optional chaining
      emotionalState = emotionalStateMatch[1].trim();
    }

    // Extract key topics
    // Regex: Looks for "Key Topics:", optional whitespace/newlines, then captures everything (*) non-greedily (?)
    // until it hits "Notable Patterns:". Uses 's' flag so '.' matches newlines.
    const keyTopicsMatch = analysis.match(
      /Key Topics:\s*\n(.*?)\n*Notable Patterns:/is // Corrected capture, added 's' flag, added 'i' flag, added \n*
    );
    if (keyTopicsMatch?.[1]) {
      // Use optional chaining
      keyTopics = keyTopicsMatch[1]
        .split("*") // Split by the bullet point marker
        .map((topic) => topic.trim())
        .filter((topic) => topic !== ""); // Remove empty entries resulting from splits
    }

    // Extract notable patterns
    // Regex: Looks for "Notable Patterns:", optional whitespace/newlines, then captures everything (*)
    // until the end of the string (<span class="math-inline">\)\. Uses 's' flag so '\.' matches newlines\.
    const notablePatternsMatch = analysis.match(
      /Notable Patterns:\s*\n(.*)$/is // Corrected: Removed extraneous HTML tag, ensure it matches to the end ($)
    );
    if (notablePatternsMatch?.[1]) {
      // Use optional chaining
      notablePatterns = notablePatternsMatch[1]
        .split("*") // Split by the bullet point marker
        .map((pattern) => pattern.trim())
        .filter((pattern) => pattern !== ""); // Remove empty entries
    }
  } catch (error) {
    console.error("Error parsing analysis string:", error);
    // Return partially extracted data or defaults if parsing fails
    return { emotionalState, keyTopics, notablePatterns };
  }

  return { emotionalState, keyTopics, notablePatterns };
}

export async function POST(request: Request) {
  // Check if clients initialized correctly
  if (!genAI || !sanityApiToken || !sanityProjectId || !sanityDataset) {
    return NextResponse.json(
      {
        error:
          "Server configuration error: Missing API keys or Sanity details.",
      },
      { status: 500 }
    );
  }

  try {
    const { messages, userId } = await request.json();

    if (!messages || !userId) {
      return NextResponse.json(
        { error: "Messages and userId are required" },
        { status: 400 }
      );
    }

    // Basic validation for messages format (optional but recommended)
    if (
      !Array.isArray(messages) ||
      messages.some(
        (msg) => typeof msg.role !== "string" || typeof msg.content !== "string"
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid 'messages' format. Expected an array of {role: string, content: string}.",
        },
        { status: 400 }
      );
    }

    // Check if the user with the provided ID exists in Sanity
    // Fetches the _id of users matching the type and _id. Result is an array.
    const userExistsQuery = `*[_type == 'users' && clerkId == $userId][0]`;

    const existingUser = await sanityClient.fetch<{ _id?: string }>( // Corrected type annotation: Expecting an object with an optional _id property
      userExistsQuery,
      {
        userId,
      }
    ); // Add type hint for fetch result

    // Check if the fetch was successful and if the user array is not empty
    if (!existingUser) {
      return NextResponse.json(
        { error: `User with provided ID '${userId}' not found.` },
        { status: 404 } // Use 404 Not Found for missing resource
      );
    }

    // Choose the Gemini model - using latest flash model as an example
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash-latest",
    });

    // Format the conversation for the prompt
    const conversationText = messages
      .map(
        (msg: { role: string; content: string }) =>
          `${msg.role}: ${msg.content}`
      ) // Add type hint for msg
      .join("\n");

    // Construct the prompt for Gemini
    const prompt = `Analyze the following conversation strictly adhering to the output format specified below. Determine the user's emotional state, key topics discussed, and any notable patterns.

Conversation:
${conversationText}

Analysis:
Emotional State:
* [Provide a concise description of the user's dominant emotional state in one word , e.g., Frustrated, Anxious, Content, Curious]

Key Topics:
* [List the main subject or theme discussed, e.g., Project deadline concerns]
* [List another key subject, e.g., Feedback on presentation]
* [Continue listing distinct topics as bullet points]

Notable Patterns:
* [Describe any recurring behaviors, questions, or linguistic patterns, e.g., Frequent use of uncertain language]
* [Describe another observed pattern, e.g., Tendency to circle back to topic X]
* [Continue listing distinct patterns as bullet points]
`;

    let analysis: string | undefined;
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      analysis = response.text();
    } catch (geminiError) {
      console.error("Error calling Gemini API:", geminiError);
      return NextResponse.json(
        { error: "Failed to get analysis from AI service." },
        { status: 503 } // Service Unavailable might be appropriate
      );
    }

    const extractedData = extractAnalysisData(analysis);

    // Prepare the document for Sanity
    const sanityDoc = {
      _type: "sentimentAnalysis", // Ensure this matches your Sanity schema type name
      userId: {
        // Often named 'user' or similar in schemas, referencing the user doc
        _type: "reference",
        _ref: existingUser._id, // Reference the user document checked earlier
      },
      messages: messages.map((message: { role: string; content: string }) => ({
        // Add type hint
        _key: Math.random().toString(36).substring(7), // Add a unique _key for array items if needed by schema
        role: message.role,
        content: message.content,
      })),
      analysis: analysis || "Analysis generation failed or returned empty.", // Store the raw response
      timestamp: new Date().toISOString(),
      emotionalState: extractedData.emotionalState,
      keyTopics: extractedData.keyTopics,
      notablePatterns: extractedData.notablePatterns,
    };

    let sanityResult;
    try {
      sanityResult = await sanityClient.create(sanityDoc);
    } catch (sanityError) {
      console.error("Error creating Sanity document:", sanityError);
      return NextResponse.json(
        { error: "Failed to save analysis result." },
        { status: 500 }
      );
    }

    // Return the raw analysis and the Sanity document result
    return NextResponse.json(
      {
        analysis: analysis, // Send back the raw analysis
        extracted: extractedData, // Send back the parsed data
        sanityResult: sanityResult, // Send back the result of the Sanity create operation
      },
      { status: 200 }
    );
  } catch (error: any) {
    // General error handler
    console.error("Error processing analyzeUserChat request:", error);
    return NextResponse.json(
      // Use logical OR ||, not bitwise OR | |
      {
        error:
          error.message || "Failed to analyze chat due to an unexpected error.",
      },
      { status: 500 }
    );
  }
}

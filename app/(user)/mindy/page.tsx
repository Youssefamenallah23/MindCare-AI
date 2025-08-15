// Example Path: app/mindy/page.tsx (or wherever ChatbotUser component resides)
"use client";

import Bubble from "@/app/_components/Bubble"; // Assuming Bubble component exists
import LoadingBubble from "@/app/_components/LoadingBubble"; // Assuming this exists
import { useChat, type Message } from "@ai-sdk/react";
import { useSession } from "@clerk/nextjs";
import { useEffect, useState, useRef, useCallback } from "react";
import { Camera, SendHorizontal, Bot } from "lucide-react"; // Import icons
import { Button } from "@/components/ui/button"; // Assuming Shadcn Button
import { Input } from "@/components/ui/input"; // Assuming Shadcn Input
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"; // Use Card for structure

// --- Constants for Routine Markers ---
const ROUTINE_START_TAG = "[ROUTINE_START]";
const ROUTINE_END_TAG = "[ROUTINE_END]";
const DURATION_TAG_PREFIX = "[DURATION: ";
const DURATION_TAG_SUFFIX = " DAYS]";

function ChatbotUser() {
  // --- Chat Hook & Session ---
  const {
    status,
    messages,
    input,
    handleInputChange,
    handleSubmit,
    setMessages,
  } = useChat({
    api: "/api/chat", // Your chat API endpoint
    onFinish: (message) => {
      // Process message on finish for routine tags
      handleAssistantMessage(message);
    },
  });
  const { session, isLoaded } = useSession();

  // --- Timer State & Refs ---
  const [startTime, setStartTime] = useState<number | null>(null);
  const fiveMinutes = 1 * 60 * 1000; // 5 minutes
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [analysisDoneToday, setAnalysisDoneToday] = useState(false);
  // Calculate localStorageKey dynamically based on session
  const localStorageKey = session?.user?.id
    ? `chatAnalysisDoneToday_${session.user.id}`
    : null;

  // --- Routine State & Ref ---
  const [latestSuggestedRoutineContent, setLatestSuggestedRoutineContent] =
    useState<string | null>(null); // Stores content between START/END tags
  const isSavingRoutine = useRef(false); // Prevent duplicate saves

  // --- Scroll Logic ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // --- Timer-Based Analysis Logic ---
  const checkIfAnalysisDoneToday = useCallback(async () => {
    // Check if key is valid before accessing localStorage
    if (!localStorageKey) return false;
    const storedValue = localStorage.getItem(localStorageKey);
    if (storedValue) {
      const storedDate = new Date(storedValue);
      const today = new Date();
      return (
        storedDate.getFullYear() === today.getFullYear() &&
        storedDate.getMonth() === today.getMonth() &&
        storedDate.getDate() === today.getDate()
      );
    }
    return false;
  }, [localStorageKey]); // Depend only on the key itself

  useEffect(() => {
    // Check analysis status when session is loaded
    const checkOnLoad = async () => {
      if (isLoaded && session) {
        // Ensure session exists
        const doneToday = await checkIfAnalysisDoneToday();
        setAnalysisDoneToday(doneToday);
        console.log(`Initial check: Analysis done today? ${doneToday}`);
      }
    };
    checkOnLoad();
  }, [checkIfAnalysisDoneToday, isLoaded, session]); // Depend on check function, load status, and session presence

  const analyzeChat = useCallback(async () => {
    // Final check before API call
    if (!session?.user?.id || analysisDoneToday || !localStorageKey) {
      console.log(
        `analyzeChat skipped: session=${!!session?.user?.id}, doneToday=${analysisDoneToday}, keyExists=${!!localStorageKey}`
      );
      return;
    }

    console.log("Timer fired: Calling /api/analyzeUserChat...");
    try {
      // IMPORTANT: Ensure this API call gets the messages it needs.
      // Passing the whole 'messages' array might be large. Consider if API can fetch them.
      await fetch("/api/analyzeUserChat", {
        // Ensure this API exists
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages, userId: session.user.id }), // Sending current messages state
      });
      console.log("Chat analyzed (timer) and saved flag set (localStorage).");
      setAnalysisDoneToday(true); // Prevent timer firing again today
      localStorage.setItem(localStorageKey, new Date().toISOString());
      setStartTime(null); // Reset timer start time
    } catch (error) {
      console.error("Failed to analyze chat (timer):", error);
      // Decide if you want to set analysisDoneToday=true even on error to prevent retries
    }
    // Include messages in dependency array because the body depends on it
  }, [session?.user?.id, messages, analysisDoneToday, localStorageKey]);

  // Effect to manage the analysis timer interval
  useEffect(() => {
    // Conditions to NOT start the timer
    if (!isLoaded || !session?.user?.id || analysisDoneToday) {
      if (analysisDoneToday)
        console.log("Analysis done today. Timer not starting/stopped.");
      // Clear interval if it exists and conditions aren't met
      // (Logic moved to cleanup function for robustness)
      return;
    }

    // Start timer only once after conditions are met
    let currentStartTime = startTime;
    if (currentStartTime === null) {
      currentStartTime = Date.now();
      setStartTime(currentStartTime); // Set the start time state
      console.log(
        `Timer started. Will fire analyzeChat in ${fiveMinutes / 1000}s if conditions met.`
      );
    }

    const interval = setInterval(() => {
      // Read the latest startTime from state INSIDE the interval
      if (
        startTime &&
        !analysisDoneToday &&
        Date.now() - startTime >= fiveMinutes &&
        messages.length > 0
      ) {
        console.log("Timer duration reached, calling analyzeChat.");
        analyzeChat(); // Call the analysis function
        clearInterval(interval); // Stop interval once condition met
      } else if (analysisDoneToday) {
        // If analysis becomes done while interval is running, clear it
        console.log("Analysis done, clearing interval from inside.");
        clearInterval(interval);
      }
    }, 5000); // Check every 5 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => {
      console.log("Clearing timer interval (cleanup).");
      clearInterval(interval);
    };
    // Include all relevant dependencies that control the timer's lifecycle
  }, [
    isLoaded,
    session,
    analysisDoneToday,
    startTime,
    fiveMinutes,
    analyzeChat,
  ]);

  // --- Routine Saving Logic ---
  const saveRoutineToDb = useCallback(
    async (routineContent: string, duration: number) => {
      if (!session?.user?.id || isSavingRoutine.current) return;
      console.log(
        `Attempting to save routine with duration: ${duration} days...`
      );
      isSavingRoutine.current = true;
      try {
        const response = await fetch("/api/save-confirmed-routine", {
          // Ensure this API exists
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ routineContent, duration }),
        });
        const result = await response.json(); // Read body regardless of status
        if (!response.ok) {
          console.error(
            `Save routine API error: ${response.statusText}`,
            result
          );
          // Check if backend indicated routine already exists
          if (result.routineExists === true || response.status === 409) {
            alert("Routine for today already exists.");
          } else {
            throw new Error(
              result.error || `Failed to save routine (${response.status})`
            );
          }
        } else {
          console.log("Confirmed routine save API successful:", result);
          if (result.routineExists === true) {
            // Handle backend check message
            alert("Routine for today already exists.");
          } else {
            alert("Routine saved!");
          }
        }
        setLatestSuggestedRoutineContent(null); // Clear temp storage on success or handled "exists"
      } catch (error) {
        console.error("Error calling save routine API:", error);
        // Avoid alert if it was the "already exists" case handled above
        if (
          !(error instanceof Error && error.message.includes("already exists"))
        ) {
          alert(
            `Sorry, couldn't save the routine: ${error instanceof Error ? error.message : "Unknown error"}`
          );
        }
      } finally {
        isSavingRoutine.current = false;
      }
    },
    [session?.user?.id]
  ); // Dependency on session

  // --- Process Messages for Routine Tags ---
  const handleAssistantMessage = useCallback(
    (message: Message) => {
      if (message.role !== "assistant") return;

      let content = message.content;
      let durationTagFound = false;

      // 1. Store suggested content when START/END tags are found
      if (
        content.includes(ROUTINE_START_TAG) &&
        content.includes(ROUTINE_END_TAG)
      ) {
        const startIndex =
          content.indexOf(ROUTINE_START_TAG) + ROUTINE_START_TAG.length;
        const endIndex = content.indexOf(ROUTINE_END_TAG);
        if (startIndex < endIndex) {
          const extracted = content.substring(startIndex, endIndex).trim();
          setLatestSuggestedRoutineContent(extracted);
          console.log("Stored routine suggestion content.");
        }
      }

      // 2. Handle DURATION tag - this triggers the save
      if (
        content.includes(DURATION_TAG_PREFIX) &&
        content.includes(DURATION_TAG_SUFFIX)
      ) {
        durationTagFound = true;
        const startIndex =
          content.indexOf(DURATION_TAG_PREFIX) + DURATION_TAG_PREFIX.length;
        const endIndex = content.indexOf(DURATION_TAG_SUFFIX);
        if (startIndex < endIndex) {
          const durationStr = content.substring(startIndex, endIndex).trim();
          const durationNum = parseInt(durationStr, 10);
          console.log(
            `Duration tag detected. Extracted duration: ${durationNum}`
          );

          if (
            !isNaN(durationNum) &&
            durationNum > 0 &&
            latestSuggestedRoutineContent &&
            !isSavingRoutine.current
          ) {
            saveRoutineToDb(latestSuggestedRoutineContent, durationNum);
          } else if (!latestSuggestedRoutineContent) {
            console.warn(
              "Duration tag found, but no routine content in state to save."
            );
          } else if (isNaN(durationNum) || durationNum <= 0) {
            console.warn(`Invalid duration extracted: ${durationStr}.`);
            alert(
              "Couldn't understand the duration, please try confirming again."
            );
          } else if (isSavingRoutine.current) {
            console.log("Save routine already in progress.");
          }
        } else {
          console.warn(
            "Could not properly extract duration from tag:",
            content
          );
        }
        // Remove the DURATION tag from the content
        content = content.replace(/\[DURATION:\s*\d+\s*DAYS\]/g, "").trim();
      }

      // 3. Update message state ONLY if duration tag was removed
      if (durationTagFound) {
        setMessages((currentMessages) =>
          currentMessages.map((m) =>
            m.id === message.id ? { ...m, content: content } : m
          )
        );
      }
    },
    [latestSuggestedRoutineContent, saveRoutineToDb, setMessages]
  ); // Dependencies

  // --- Component Return (Redesigned JSX) ---
  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-4 py-8">
      <Card className="w-full -mt-16 max-w-3xl h-[85vh] md:h-[80vh] flex flex-col shadow-2xl bg-white/90 backdrop-blur-md dark:bg-gray-900/90 rounded-3xl border-none">
        {/* Header */}
        <CardHeader className="flex flex-row items-center justify-between gap-3 p-4 border-b border-gray-300 dark:border-gray-700 bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 text-white rounded-t-3xl shadow-md">
          <div className="flex items-center gap-2">
            <Bot className="h-6 w-6 text-white" />
            <CardTitle className="text-lg font-bold tracking-tight">
              Mindy AI
            </CardTitle>
          </div>
          <span className="text-sm bg-white/20 px-3 py-1 rounded-full shadow text-white font-semibold animate-pulse">
            Mental Health Mode
          </span>
        </CardHeader>

        {/* Chat Messages */}
        <CardContent
          ref={chatContainerRef}
          className="flex-grow overflow-y-auto p-4 space-y-4 scroll-smooth"
        >
          {messages.length === 0 && isLoaded ? (
            <p className="text-center text-muted-foreground dark:text-gray-400 mt-10 italic">
              Let’s start a new day together 💬
            </p>
          ) : (
            messages.map((message) => (
              <Bubble key={message.id} message={message} />
            ))
          )}
          {status === "streaming" && <LoadingBubble />}
          <div className="h-2"></div> {/* Spacer */}
        </CardContent>

        {/* Footer */}
        <CardFooter className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-800/80 backdrop-blur rounded-b-3xl">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 w-full"
          >
            <Input
              type="text"
              value={input}
              onChange={handleInputChange}
              placeholder="How are you feeling today?"
              disabled={status !== "ready"}
              className="flex-grow bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 rounded-full px-4 py-2 shadow-inner placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              autoComplete="off"
            />

            <Button
              type="submit"
              variant="default"
              size="icon"
              disabled={status !== "ready" || !input.trim()}
              className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full shadow-lg transition-all"
            >
              <SendHorizontal className="h-5 w-5" />
              <span className="sr-only">Send</span>
            </Button>
          </form>
        </CardFooter>

        {/* Status Note */}
        {analysisDoneToday && (
          <p className="text-center text-xs text-muted-foreground mt-1 py-4 italic animate-fade-in">
            🎉 Great job today — your chat has been analyzed!
          </p>
        )}
      </Card>
    </div>
  );
}

export default ChatbotUser;

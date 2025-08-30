"use client";

import MoodCalendar from "@/components/mini-component/moodCalender";
import ShowRoutine from "@/components/mini-component/ShowRoutine";
import TaskCompletionChart from "@/components/mini-component/taskCompletionChart";
import { useSession } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { createClient } from "@sanity/client";
import { Card, CardContent } from "@/components/ui/card";

const client = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn:
    process.env.NODE_ENV === "production" &&
    !process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  apiVersion: "2024-03-11",
});

interface Quote {
  quoteText: string;
  author?: string;
}

const MoodCalendarPage: React.FC = () => {
  const { session, isLoaded } = useSession();
  console.log("gsegsegvcv", session);
  const clerkId = session?.user?.id;

  const [sanityUserId, setSanityUserId] = useState<string | null>(null);
  const [loadingSanityId, setLoadingSanityId] = useState(true);
  const [errorSanityId, setErrorSanityId] = useState<string | null>(null);

  const [quote, setQuote] = useState<Quote | null>(null);
  const [isLoadingQuote, setIsLoadingQuote] = useState(true);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const fetchSanityId = useCallback(async () => {
    if (!isLoaded || !clerkId) {
      if (isLoaded && !clerkId) {
        setLoadingSanityId(false);
        setErrorSanityId("User not logged in.");
      }
      return;
    }
    setLoadingSanityId(true);
    setErrorSanityId(null);
    try {
      const query = `*[_type == 'users' && clerkId == $clerkId][0]._id`;
      const params = { clerkId };
      const id = await client.fetch<string | null>(query, params);
      if (id) {
        setSanityUserId(id);
      } else {
        setErrorSanityId("Could not find user profile.");
        setSanityUserId(null);
      }
    } catch (error: any) {
      setErrorSanityId("Failed to fetch user ID.");
      setSanityUserId(null);
    } finally {
      setLoadingSanityId(false);
    }
  }, [clerkId, isLoaded]);

  const fetchQuote = useCallback(async () => {
    setIsLoadingQuote(true);
    setQuoteError(null);
    try {
      const countQuery = `count(*[_type == "quote"])`;
      const randomIndex = Math.floor(
        Math.random() * (await client.fetch(countQuery))
      );
      const quoteQuery = `*[_type == "quote"] | order(_createdAt desc) [${randomIndex}] {
        quoteText,
        author
      }`;
      const fetchedQuote = await client.fetch<Quote | null>(quoteQuery);
      if (fetchedQuote) {
        setQuote(fetchedQuote);
      } else {
        setQuote(null);
      }
    } catch (error: any) {
      setQuoteError("Could not load quote.");
      setQuote(null);
    } finally {
      setIsLoadingQuote(false);
    }
  }, []);

  useEffect(() => {
    fetchSanityId();
    fetchQuote();
  }, [fetchSanityId, fetchQuote]);

  if (!isLoaded || loadingSanityId || isLoadingQuote) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 animate-pulse">
        <p className="text-xl font-semibold text-gray-600">
          Loading your dashboard...
        </p>
      </div>
    );
  }

  if (errorSanityId) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-red-50">
        <p className="text-center text-red-600 font-semibold">
          Error: {errorSanityId}
        </p>
      </div>
    );
  }

  if (sanityUserId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-6">
        <div className="max-w-full mx-36 space-y-8">
          {/* --- Header --- */}
          <h1 className="text-4xl font-extrabold text-center bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent animate-fade-in">
            Your Dashboard 🧘‍♀️🌟
          </h1>

          {/* --- Daily Quote --- */}
          {!isLoadingQuote && !quoteError && quote && (
            <Card className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md shadow-lg hover:shadow-2xl transition-all duration-300">
              <CardContent className="p-6 text-center">
                <blockquote className="text-xl italic text-gray-700 relative">
                  <span className="absolute top-0 left-2 text-5xl text-purple-300 font-serif">
                    “
                  </span>
                  {quote.quoteText}
                  <span className="absolute bottom-0 right-2 text-5xl text-purple-300 font-serif">
                    ”
                  </span>
                </blockquote>
                {quote.author && (
                  <p className="text-right text-sm font-semibold text-purple-700 mt-4">
                    — {quote.author}
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* --- Grid Layout --- */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Mood Calendar */}
            <div className="rounded-3xl bg-white/80 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-4 text-purple-700">
                Mood Calendar 📅
              </h2>
              <MoodCalendar userId={sanityUserId} />
            </div>

            {/* Task Completion Chart */}
            <div className="rounded-3xl bg-white/80 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
              <h2 className="text-2xl font-bold mb-4 text-purple-700">
                Task Completion ✅
              </h2>
              <TaskCompletionChart />
            </div>
          </div>

          {/* --- Full Width Routine Section --- */}
          <div className="rounded-3xl bg-white/80 p-6 shadow-lg hover:shadow-xl transition-all duration-300">
            <h2 className="text-2xl font-bold mb-4 text-purple-700">
              Your Daily Routine 📝
            </h2>
            <ShowRoutine />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen p-4 text-gray-600 bg-gradient-to-br from-gray-100 to-gray-200">
      Could not retrieve your profile. Please check your account settings.
    </div>
  );
};

export default MoodCalendarPage;

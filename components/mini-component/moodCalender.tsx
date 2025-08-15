"use client";

import { format, subDays } from "date-fns";
import React, { useEffect, useState } from "react";
import { createClient } from "@sanity/client";
import { useRouter } from "next/navigation";
import emojiData from "emojibase-data/en/data.json";

interface SanitySentimentAnalysis {
  _createdAt: string;
  emotionalState?: string;
}

type MoodData = {
  [date: string]: string;
};

interface MoodCalendarProps {
  userId?: string | null;
}

const moodToEmojiUnicode = (mood: string): string => {
  const keywordMap: Record<string, string[]> = {
    happy: ["smiling face with smiling eyes"],
    sad: ["crying face"],
    angry: ["angry face"],
    neutral: ["neutral face"],
    excited: ["star-struck"],
    tired: ["sleeping face"],
    scared: ["fearful face"],
    joyful: ["grinning face with big eyes"],
    content: ["relieved face"],
    stressed: ["anguished face"],
  };

  const terms = keywordMap[mood.toLowerCase()] || ["neutral face"];
  for (const term of terms) {
    const emojiEntry = emojiData.find((e: any) => e.label === term);
    if (emojiEntry) return emojiEntry.emoji;
  }
  return "😐";
};

const moodColorMap: Record<string, string> = {
  happy: "bg-green-200",
  sad: "bg-blue-200",
  angry: "bg-red-200",
  neutral: "bg-gray-200",
  excited: "bg-pink-200",
  tired: "bg-yellow-100",
  scared: "bg-indigo-200",
  joyful: "bg-orange-200",
  content: "bg-teal-200",
  stressed: "bg-purple-200",
};

const MoodCalendar: React.FC<MoodCalendarProps> = ({
  userId: sanityUserIdProp,
}) => {
  const [moodData, setMoodData] = useState<MoodData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchMoodData = async () => {
      if (!sanityUserIdProp) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      const today = new Date();
      const fourteenDaysAgo = subDays(today, 14);

      const client = createClient({
        projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "",
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "",
        token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
        useCdn: true,
        apiVersion: "2024-03-11",
      });

      const moodQuery = `
  *[_type == 'sentimentAnalysis' &&
    references($sanityUserId) &&
    timestamp >= $startDate &&
    timestamp <= $endDate] {
    timestamp,
    emotionalState
  } | order(timestamp asc)
`;

      try {
        const results: SanitySentimentAnalysis[] = await client.fetch(
          moodQuery,
          {
            sanityUserId: sanityUserIdProp,
            startDate: fourteenDaysAgo.toISOString(),
            endDate: today.toISOString(),
          }
        );

        const formattedMoodData: MoodData = {};
        const allDays = Array.from({ length: 14 }, (_, i) =>
          format(subDays(today, i), "yyyy-MM-dd")
        ).reverse();

        allDays.forEach((day) => {
          formattedMoodData[day] = "neutral";
        });

        results.forEach((item) => {
          const formattedDate = format(new Date(item.timestamp), "yyyy-MM-dd");
          if (item.emotionalState) {
            formattedMoodData[formattedDate] =
              item.emotionalState.toLowerCase();
          }
        });

        setMoodData(formattedMoodData);
      } catch (moodFetchError: any) {
        console.error("Error fetching mood data from Sanity:", moodFetchError);
        setError("Failed to load mood data.");
      } finally {
        setLoading(false);
      }
    };

    fetchMoodData();
  }, [sanityUserIdProp, router]);

  const today = new Date();
  const last15Days = Array.from({ length: 15 }, (_, i) =>
    subDays(today, i)
  ).reverse();

  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  if (loading)
    return <div className="text-center py-8">Loading mood data...</div>;
  if (error)
    return <div className="text-center py-8 text-red-500">{error}</div>;

  const handleDayClick = (date: string) => {
    router.push(`/sentimentdetails?date=${date}`);
  };

  return (
    <div className="rounded-2xl p-6 shadow-xl bg-gradient-to-tr from-[#fef6f3] to-[#f4e5f7]">
      <h2 className="text-xl font-bold text-center text-gray-700 mb-4">
        Your Emotional Calendar
      </h2>
      <div className="grid grid-cols-7 gap-3 text-center text-sm text-gray-500 mb-2">
        {daysOfWeek.map((day) => (
          <div key={day}>{day}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-3">
        {last15Days.map((day) => {
          const formattedDate = format(day, "yyyy-MM-dd");
          const mood = moodData[formattedDate] || "neutral";
          const emoji = moodToEmojiUnicode(mood);
          const color = moodColorMap[mood] || "bg-gray-200";
          const isToday = formattedDate === format(new Date(), "yyyy-MM-dd");

          return (
            <button
              key={formattedDate}
              onClick={() => handleDayClick(formattedDate)}
              className={`rounded-xl p-3 flex flex-col items-center justify-center transition-all transform hover:scale-105 hover:shadow-lg ${color} ${
                isToday ? "ring-2 ring-blue-500" : ""
              }`}
              title={`${formattedDate} - ${mood}`}
            >
              <span className="text-xs text-gray-700 mb-1">
                {format(day, "d")}
              </span>
              <span className="text-2xl">{emoji}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MoodCalendar;

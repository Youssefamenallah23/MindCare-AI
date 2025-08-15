"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@sanity/client";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { useAuth } from "@clerk/nextjs";
import { Bot } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface SentimentAnalysisDetail {
  _createdAt: string;
  messages: { _key: string; role: string; content: string }[];
  analysis: string;
  timestamp: string;
  tags?: string[] | null;
  emotionalState?: string | null;
  keyTopics?: string[] | null;
  notablePatterns?: string[] | null;
  user: { _ref: string };
}

const SentimentDetailsPage = () => {
  const searchParams = useSearchParams();
  const date = searchParams.get("date");
  const [sentimentDetail, setSentimentDetail] =
    useState<SentimentAnalysisDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sanityUserId, setSanityUserId] = useState<string | null>(null);
  const { userId: clerkId } = useAuth();

  useEffect(() => {
    const fetchSanityId = async () => {
      if (!clerkId) return;
      const client = createClient({
        projectId:
          process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
        token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
        useCdn: true,
        apiVersion: "2024-03-11",
      });
      const userQuery = `*[_type == 'users' && clerkId == $clerkId][0]._id`;
      try {
        const id = await client.fetch<string>(userQuery, { clerkId });
        setSanityUserId(id);
      } catch (error) {
        console.error("Error fetching Sanity user ID:", error);
        setError("Failed to fetch user ID.");
      }
    };
    fetchSanityId();
  }, [clerkId]);

  useEffect(() => {
    const fetchSentimentDetails = async () => {
      if (!date || !sanityUserId) return;
      setLoading(true);
      setError(null);
      const client = createClient({
        projectId:
          process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
        dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
        token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
        useCdn: true,
        apiVersion: "2024-03-11",
      });
      const parsedDate = parseISO(date);
      const startOfDay = format(parsedDate, "yyyy-MM-dd'T'00:00:00.000'Z'");
      const endOfDay = format(parsedDate, "yyyy-MM-dd'T'23:59:59.999'Z'");
      const query = `
        *[_type == 'sentimentAnalysis' &&
          references($userId) &&
          _createdAt >= $startDate &&
          _createdAt <= $endDate][0] {
          _createdAt,
          messages,
          analysis,
          timestamp,
          tags,
          emotionalState,
          keyTopics,
          notablePatterns,
          user->{_id}
        }
      `;
      try {
        const result = await client.fetch<SentimentAnalysisDetail>(query, {
          userId: sanityUserId,
          startDate: startOfDay,
          endDate: endOfDay,
        });
        setSentimentDetail(result);
      } catch (error) {
        console.error("Error fetching sentiment details:", error);
        setError("Failed to load sentiment details.");
      } finally {
        setLoading(false);
      }
    };
    fetchSentimentDetails();
  }, [date, sanityUserId]);

  if (loading) return <div className="py-8 text-center">Loading...</div>;
  if (error)
    return <div className="py-8 text-center text-red-500">{error}</div>;
  if (!sentimentDetail)
    return (
      <div className="py-12 px-6 text-center  border h-svh border-purple-500/30 bg-gradient-to-br from-purple-100/40 to-indigo-100/40 dark:from-purple-900/20 dark:to-indigo-900/20 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
        <div className="text-5xl mb-4 animate-bounce-slow">🕳️</div>
        <h2 className="text-4xl font-bold text-purple-700 dark:text-purple-300">
          Nothing here... yet!
        </h2>
        <p className="text-xl text-muted-foreground mt-1">
          This day has no recorded activity. Choose another or come back soon.
        </p>
      </div>
    );

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 via-purple-100 to-indigo-100 dark:from-gray-900 dark:to-gray-950 px-4 pb-20">
      <div className="max-w-3xl mx-auto py-10 space-y-6">
        <Card className="rounded-xl p-6 bg-white dark:bg-gray-900 shadow-lg border border-purple-300">
          <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-300 mb-4">
            🧠 Sentiment Overview -{" "}
            {format(parseISO(sentimentDetail._createdAt), "PPP")}
          </h2>

          {sentimentDetail.emotionalState && (
            <p>
              <span className="font-semibold text-pink-600">Mood:</span>{" "}
              {sentimentDetail.emotionalState}
            </p>
          )}

          {sentimentDetail.analysis && (
            <p>
              <span className="font-semibold text-indigo-600">AI Insight:</span>{" "}
              {sentimentDetail.analysis}
            </p>
          )}

          {sentimentDetail.tags && (
            <p>
              <span className="font-semibold text-yellow-600">Tags:</span>{" "}
              {sentimentDetail.tags.join(", ")}
            </p>
          )}

          {sentimentDetail.keyTopics && (
            <p>
              <span className="font-semibold text-blue-600">Topics:</span>{" "}
              {sentimentDetail.keyTopics.join(", ")}
            </p>
          )}

          {sentimentDetail.notablePatterns && (
            <p>
              <span className="font-semibold text-green-600">Patterns:</span>{" "}
              {sentimentDetail.notablePatterns.join(", ")}
            </p>
          )}

          <p>
            <span className="font-semibold text-gray-700 dark:text-gray-300">
              Time:
            </span>{" "}
            {format(parseISO(sentimentDetail.timestamp), "p")}
          </p>
        </Card>

        <Card className="rounded-xl bg-white dark:bg-gray-900 shadow-md border border-pink-200 h-[400px] overflow-hidden">
          <h3 className="text-lg font-semibold text-pink-700 dark:text-pink-300 px-4 pt-4">
            🗨️ Conversation
          </h3>
          <ScrollArea className="h-[340px] px-4 pb-4 mt-2">
            <div className="space-y-3">
              {sentimentDetail.messages.map((msg) => (
                <div
                  key={msg._key}
                  className={`max-w-[75%] px-4 py-2 rounded-xl text-sm ${
                    msg.role === "user"
                      ? "bg-purple-100 text-purple-900 ml-auto"
                      : "bg-blue-100 text-blue-900"
                  }`}
                >
                  <p className="font-bold mb-1">
                    {msg.role === "user" ? "You" : "Mindy"}
                  </p>
                  <p>{msg.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      </div>
    </div>
  );
};

export default SentimentDetailsPage;

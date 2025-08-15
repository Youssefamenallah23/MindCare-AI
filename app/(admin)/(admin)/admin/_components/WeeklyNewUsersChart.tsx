"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  format,
  subDays,
  eachDayOfInterval,
  startOfDay,
  parseISO,
} from "date-fns";
import { createClient } from "@sanity/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Loader } from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

const sanityClient = createClient({
  projectId: projectId || "missing_project_id",
  dataset: dataset || "missing_dataset",
  token: token,
  useCdn: !token,
  apiVersion: "2024-03-11",
});

interface NewUserRecord {
  _createdAt: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
    borderWidth: number;
    borderRadius: number;
    barThickness: number;
  }[];
}

export function WeeklyNewUsersChart() {
  const [chartData, setChartData] = useState<ChartData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<"week" | "month">("week");

  const fetchUserData = useCallback(async (range: "week" | "month") => {
    setIsLoading(true);
    setError(null);

    try {
      const today = new Date();
      const startDate = subDays(today, range === "week" ? 7 : 30);
      const startDateISO = format(startDate, "yyyy-MM-dd'T'HH:mm:ss.SSS'Z'");
      console.log("Fetching user data from:", startDateISO);
      const query = `*[_type == "users" && createdAt >= $startDate]{ createdAt }`;
      const params = { startDate: startDateISO };
      const usersData = await sanityClient.fetch<NewUserRecord[] | null>(
        query,
        params
      );

      if (!usersData) throw new Error("No user data returned");

      const dateCounts: Record<string, number> = {};
      const interval = eachDayOfInterval({
        start: subDays(today, range === "week" ? 6 : 29),
        end: today,
      });

      interval.forEach((day) => {
        dateCounts[format(day, "yyyy-MM-dd")] = 0;
      });

      usersData.forEach((user) => {
        const creationDate = format(
          startOfDay(parseISO(user.createdAt)),
          "yyyy-MM-dd"
        );
        if (dateCounts.hasOwnProperty(creationDate)) {
          dateCounts[creationDate]++;
        }
      });

      const labels = interval.map((day) =>
        format(day, range === "week" ? "EEE" : "MMM d")
      );
      const dataPoints = interval.map(
        (day) => dateCounts[format(day, "yyyy-MM-dd")] ?? 0
      );

      setChartData({
        labels,
        datasets: [
          {
            label: "New Users",
            data: dataPoints,
            backgroundColor: "rgba(139, 92, 246, 0.8)", // Tailwind's indigo-500
            borderColor: "rgba(139, 92, 246, 1)",
            borderWidth: 1,
            borderRadius: 6,
            barThickness: 20,
          },
        ],
      });
    } catch (err: any) {
      console.error("Failed to fetch user data:", err);
      setError(err.message || "Could not load chart data.");
      setChartData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUserData(timeRange);
  }, [fetchUserData, timeRange]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, title: { display: false } },
    scales: {
      x: { grid: { display: false } },
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" },
        beginAtZero: true,
        ticks: { stepSize: 1 },
      },
    },
  };

  return (
    <Card className="bg-gradient-to-br from-purple-100/50 to-white/30 dark:from-purple-900/40 dark:to-slate-900/30 border border-border shadow-lg rounded-2xl backdrop-blur-md p-2 transition hover:scale-[1.01]">
      <CardHeader className="space-y-2">
        <CardTitle className="text-base font-semibold text-muted-foreground dark:text-white">
          New Users Trend
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Users joined in the last {timeRange === "week" ? "7 days" : "30 days"}
          .
        </CardDescription>

        <RadioGroup
          defaultValue="week"
          className="flex items-center space-x-4"
          onValueChange={setTimeRange}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="week" id="week" />
            <Label htmlFor="week">Last Week</Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="month" id="month" />
            <Label htmlFor="month">Last Month</Label>
          </div>
        </RadioGroup>
      </CardHeader>

      <CardContent className="h-[320px] relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-red-600">
            {error}
          </div>
        )}
        {!isLoading &&
          !error &&
          chartData?.datasets[0]?.data?.every((d) => d === 0) && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No new users in the selected time period.
            </div>
          )}
        {!isLoading && !error && chartData && (
          <Bar data={chartData} options={options} />
        )}
      </CardContent>
    </Card>
  );
}

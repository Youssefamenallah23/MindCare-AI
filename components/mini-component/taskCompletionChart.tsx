"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { format, subDays, parseISO } from "date-fns"; // Added parseISO
import { useSession } from "@clerk/nextjs";
import { createClient } from "@sanity/client";

const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Adjust import path if needed // Import your shared Sanity client

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

// Interface for the fetched routine data relevant to the chart
interface FetchedRoutine {
  routineDate: string; // YYYY-MM-DD
  tasks: Array<{ completed: boolean }>;
}

// Interface for processed daily data
interface DailyCompletion {
  date: Date;
  rate: number;
}

const TaskCompletionChart: React.FC = () => {
  const { session, isLoaded } = useSession();
  const [timeRange, setTimeRange] = useState<"week" | "twoWeeks" | "month">(
    "week"
  );
  // State for fetched data, loading, and errors
  const [fetchedRoutines, setFetchedRoutines] = useState<
    FetchedRoutine[] | null
  >(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // State specifically for chart data derived from fetched routines
  const [chartData, setChartData] = useState<{
    labels: string[];
    rates: number[];
  }>({ labels: [], rates: [] });

  // --- Fetching Logic ---
  const fetchCompletionData = useCallback(
    async (clerkId: string, range: "week" | "twoWeeks" | "month") => {
      setIsLoading(true);
      setError(null);
      setFetchedRoutines(null); // Clear previous data

      const daysToFetch = range === "week" ? 7 : range === "twoWeeks" ? 14 : 30;
      const today = new Date();
      // Go back one extra day to ensure we include the start date correctly
      const startDate = format(subDays(today, daysToFetch - 1), "yyyy-MM-dd");

      // GROQ Query to get routines within the date range for the specific user
      const query = `*[_type == "routines" &&
      routineDate >= $startDate && // Fetch routines from start date onwards
      user._ref in *[_type=="users" && clerkId==$clerkId]._id
    ] | order(routineDate asc) {
      routineDate,
      tasks[]{ completed } // Only fetch necessary task data
    }`;

      const params = {
        startDate: startDate,
        clerkId: clerkId,
      };

      try {
        const data = await sanityClient.fetch<FetchedRoutine[]>(query, params);
        setFetchedRoutines(data || []); // Set to empty array if null/undefined
      } catch (err: any) {
        console.error("Error fetching completion data:", err);
        setError(err.message || "Failed to fetch completion data.");
        setFetchedRoutines([]); // Set empty on error to prevent processing issues
      } finally {
        setIsLoading(false);
      }
    },
    []
  ); // Empty dependency array as it gets clerkId/range via arguments

  // Effect to trigger fetch when session or timeRange changes
  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      fetchCompletionData(session.user.id, timeRange);
    } else if (isLoaded && !session) {
      // Handle logged out state
      setIsLoading(false);
      setError(null);
      setFetchedRoutines([]); // Clear data if logged out
    }
  }, [isLoaded, session, timeRange, fetchCompletionData]);

  // --- Data Processing Logic ---
  useEffect(() => {
    if (isLoading || !fetchedRoutines) {
      // Don't process if loading or no data fetched yet
      setChartData({ labels: [], rates: [] }); // Reset chart data
      return;
    }

    const daysCount =
      timeRange === "week" ? 7 : timeRange === "twoWeeks" ? 14 : 30;
    const today = new Date();
    // Generate date objects for the last N days
    const lastDays = Array.from({ length: daysCount }, (_, i) =>
      subDays(today, i)
    ).reverse(); // Reverse to have oldest date first

    // Create a map for quick lookup: date string -> completion rate
    const routinesMap = new Map<string, number>();
    fetchedRoutines.forEach((routine) => {
      if (!routine.tasks || routine.tasks.length === 0) {
        routinesMap.set(routine.routineDate, 0); // 0% if no tasks
      } else {
        const totalTasks = routine.tasks.length;
        const completedTasks = routine.tasks.filter((t) => t.completed).length;
        const rate = Math.round((completedTasks / totalTasks) * 100); // Round percentage
        routinesMap.set(routine.routineDate, rate);
      }
    });

    // Generate labels and rates for the chart based on the last N days
    const processedLabels: string[] = [];
    const processedRates: number[] = [];

    lastDays.forEach((day) => {
      // Label format depends on range (e.g., 'EEE' for week, 'MM/dd' for month)
      const labelFormat = daysCount <= 14 ? "EEE" : "MM/dd";
      processedLabels.push(format(day, labelFormat));

      // Find completion rate for this day
      const dateString = format(day, "yyyy-MM-dd");
      processedRates.push(routinesMap.get(dateString) ?? 0); // Use 0 if no routine found for the day
    });

    setChartData({ labels: processedLabels, rates: processedRates });
  }, [fetchedRoutines, timeRange, isLoading]); // Recalculate when fetched data or range changes

  // --- Chart Configuration (using processed chartData state) ---
  const data = {
    labels: chartData.labels,
    datasets: [
      {
        label: "Completion Rate (%)",
        data: chartData.rates,
        backgroundColor: "rgba(139, 92, 246, 0.7)", // Adjusted purple
        borderColor: "rgba(124, 58, 237, 1)", // Darker purple border
        borderWidth: 1,
        borderRadius: 5, // Slightly less rounded
        barThickness: timeRange === "month" ? 12 : 20, // Thinner bars for month view
        hoverBackgroundColor: "rgba(124, 58, 237, 0.9)",
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // Allow chart to resize height
    plugins: {
      legend: { display: false }, // Hide legend if only one dataset
      title: { display: false }, // Title is handled by the h2 tag
      tooltip: {
        enabled: true,
        backgroundColor: "rgba(76, 29, 149, 0.9)", // Dark purple tooltip
        titleColor: "#fff",
        bodyColor: "#fff",
        callbacks: {
          // Format tooltip
          label: function (context: any) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y + "%";
            }
            return label;
          },
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }, // Smaller x-axis labels
      },
      y: {
        grid: { color: "rgba(0, 0, 0, 0.05)" }, // Lighter grid lines
        beginAtZero: true,
        max: 100, // Ensure y-axis goes up to 100%
        ticks: {
          // Format y-axis labels as percentages
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  // --- Render Logic ---
  return (
    <div className="bg-white rounded-lg shadow p-4 md:p-6">
      {" "}
      {/* Added responsive padding */}
      <h2 className="text-lg md:text-xl font-semibold text-gray-700 mb-4">
        Task Completion Rate
      </h2>
      <div className="flex flex-wrap gap-2 mb-4">
        {" "}
        {/* Added flex-wrap */}
        <button
          onClick={() => setTimeRange("week")}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${
            // Responsive padding/text
            timeRange === "week"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Week
        </button>
        <button
          onClick={() => setTimeRange("twoWeeks")}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${
            timeRange === "twoWeeks"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Two Weeks
        </button>
        <button
          onClick={() => setTimeRange("month")}
          disabled={isLoading}
          className={`px-3 py-1.5 text-xs md:text-sm rounded-md ${
            timeRange === "month"
              ? "bg-violet-600 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          } ${isLoading ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Month
        </button>
      </div>
      {/* Chart container with defined height */}
      <div className="relative h-64 md:h-72">
        {" "}
        {/* Set explicit height */}
        {isLoading &&
          !fetchedRoutines && ( // Show loading only on initial load
            <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-75 z-10">
              <p className="text-gray-500">Loading Chart Data...</p>
            </div>
          )}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-10">
            <p className="text-red-600">{error}</p>
          </div>
        )}
        {!isLoading && !error && chartData.labels.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="text-gray-400">
              No routine data available for the selected period.
            </p>
          </div>
        )}
        <Bar data={data} options={options} />
      </div>
    </div>
  );
};

export default TaskCompletionChart;

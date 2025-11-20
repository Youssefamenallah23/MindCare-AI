"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ListChecks, Activity } from "lucide-react";

interface AdminStats {
  totalUsers?: number;
  totalRoutines?: number;
  analysesLastMonth?: number;
  newUsersLast7Days?: number;
  totalTasksAssigned?: number;
}

export function AdminStatsCards() {
  const [stats, setStats] = useState<AdminStats>({});
  const [isLoadingStats, setIsLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true);
    setStatsError(null);
    try {
      const response = await fetch("/api/admin/stats");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed stats fetch (${response.status})`
        );
      }
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      console.error("Failed to fetch admin stats:", err);
      setStatsError(err.message || "Could not load stats.");
    } finally {
      setIsLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statItems = [
    { title: "Total Users", value: stats.totalUsers, icon: Users },
    { title: "Routines Created", value: stats.totalRoutines, icon: ListChecks },
    {
      title: "Analyses (Last Month)",
      value: stats.analysesLastMonth,
      icon: Activity,
    },
    {
      title: "Total Tasks Assigned",
      value: stats.totalTasksAssigned,
      icon: ListChecks,
    },
  ];

  if (isLoadingStats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card
            key={index}
            className="animate-pulse bg-background/60 backdrop-blur-md shadow-md rounded-2xl"
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium h-5 w-2/3 bg-gray-200 dark:bg-gray-700 rounded"></CardTitle>
              <div className="h-6 w-6 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold h-8 w-1/3 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (statsError) {
    return (
      <Card className="bg-destructive/10 border border-destructive text-destructive">
        <CardHeader>
          <CardTitle>Error loading stats</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{statsError}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4">
      {statItems.map((item) => (
        <Card
          key={item.title}
          className="bg-gradient-to-br from-purple-100/50 to-white/30 dark:from-purple-900/40 dark:to-slate-900/30 border border-border shadow-lg rounded-2xl backdrop-blur-md transition hover:scale-[1.01]"
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-base font-semibold text-muted-foreground dark:text-white">
              {item.title}
            </CardTitle>
            <item.icon className="h-6 w-6 text-purple-600 dark:text-purple-300" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {item.value !== undefined ? item.value.toLocaleString() : "-"}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

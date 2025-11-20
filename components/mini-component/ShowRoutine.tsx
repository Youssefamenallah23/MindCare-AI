// app/_components/ShowRoutine.tsx
"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useSession } from "@clerk/nextjs";

import {
  format,
  parseISO,
  addDays,
  startOfDay,
  differenceInCalendarDays,
  isBefore,
  isEqual,
  subDays,
} from "date-fns";
import { createClient } from "@sanity/client";
const sanityClient = createClient({
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "missing_project_id",
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "missing_dataset",
  token: process.env.NEXT_PUBLIC_SANITY_API_TOKEN,
  useCdn: false,
  apiVersion: "2024-03-11",
}); // Adjust import path if needed
// Interfaces
interface TaskItem {
  _key: string;
  description: string;
  completed: boolean;
  dayIndex?: number;
}

interface Routine {
  _id: string;
  routineDate: string;
  insight?: string;
  duration?: number;
  tasks?: TaskItem[];
}

interface GroupedTasks {
  [dayIndex: number]: TaskItem[];
}

function ShowRoutine() {
  const { session, isLoaded } = useSession();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  // --- CORRECT STATE DECLARATION ---
  // Defines BOTH activeRoutines (the data) and setActiveRoutines (the function to update it)
  const [activeRoutines, setActiveRoutines] = useState<Routine[] | null>(null);
  // Stores the raw fetched data before filtering
  const [fetchedRoutines, setFetchedRoutines] = useState<Routine[] | null>(
    null
  );

  // --- Fetch Logic ---
  const fetchRoutines = useCallback(async (clerkId: string) => {
    setIsLoading(true);
    setError(null);
    setFetchedRoutines(null); // Clear raw fetched data
    setActiveRoutines(null); // Clear processed active routines

    const today = new Date();
    const todayDateString = format(today, "yyyy-MM-dd");
    const startDateLimit = format(subDays(today, 60), "yyyy-MM-dd");

    const query = `*[_type == "routines" &&
      routineDate <= $todayDate &&
      routineDate >= $startDateLimit &&
      user._ref in *[_type=="users" && clerkId==$clerkId]._id
    ] | order(routineDate desc) {
        _id,
        routineDate,
        insight,
        duration,
        tasks[]{ _key, description, completed, dayIndex }
      }`;
    const params = { todayDate: todayDateString, startDateLimit, clerkId };

    try {
      const data = await sanityClient.fetch<Routine[] | null>(query, params);

      setFetchedRoutines(Array.isArray(data) ? data : []); // Store raw data
    } catch (err: any) {
      console.error("Error fetching routines:", err);
      setError(err.message || "Failed to fetch routine data.");
      setFetchedRoutines([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      fetchRoutines(session.user.id);
    } else if (isLoaded && !session) {
      setIsLoading(false);
      setError(null);
      setFetchedRoutines([]); // No user, clear fetched data
    }
  }, [isLoaded, session, fetchRoutines]);

  // --- Filtering Logic (using useMemo) ---
  // This depends on fetchedRoutines, not activeRoutines
  const filteredActiveRoutines = useMemo(() => {
    if (!fetchedRoutines) return [];

    const todayStart = startOfDay(new Date());

    return fetchedRoutines.filter((routine) => {
      try {
        const startDate = parseISO(routine.routineDate);
        const duration = routine.duration ?? 1;
        const daysPassed = differenceInCalendarDays(
          todayStart,
          startOfDay(startDate)
        );
        const isActive = !isNaN(daysPassed) && daysPassed < duration;

        return isActive;
      } catch (e) {
        console.error(
          "Error parsing date or filtering routine:",
          routine._id,
          e
        );
        return false;
      }
    });
  }, [fetchedRoutines]); // Recalculate when fetchedRoutines changes

  // --- Effect to update the main state after filtering ---
  // This separates fetching and filtering from the state used for rendering/updates
  useEffect(() => {
    setActiveRoutines(filteredActiveRoutines);
  }, [filteredActiveRoutines]);

  // --- Toggle Task Completion Handler ---
  // Uses and updates the 'activeRoutines' state
  const handleToggleComplete = useCallback(
    async (routineId: string, taskKey: string) => {
      if (!activeRoutines || updatingTaskId) return; // Check activeRoutines state

      let targetRoutineIndex = -1;
      let targetTaskIndex = -1;
      let originalTasksState: TaskItem[] | undefined;

      // Store the current state for potential reversion
      const originalActiveRoutines = activeRoutines;

      activeRoutines.forEach((routine, rIndex) => {
        if (routine._id === routineId) {
          targetRoutineIndex = rIndex;
          originalTasksState = routine.tasks;
          targetTaskIndex =
            routine.tasks?.findIndex((task) => task._key === taskKey) ?? -1;
        }
      });

      if (
        targetRoutineIndex === -1 ||
        targetTaskIndex === -1 ||
        !originalTasksState
      )
        return;

      const taskToUpdate = originalTasksState[targetTaskIndex];
      const newCompletedStatus = !taskToUpdate.completed;

      // Optimistic Update using setActiveRoutines
      setUpdatingTaskId(taskKey);
      const updatedTasks = originalTasksState.map((task, index) =>
        index === targetTaskIndex
          ? { ...task, completed: newCompletedStatus }
          : task
      );
      const newRoutinesData = activeRoutines.map((routine, index) =>
        index === targetRoutineIndex
          ? { ...routine, tasks: updatedTasks }
          : routine
      );
      // Correct call to the state setter function
      setActiveRoutines(newRoutinesData);

      // API Call
      try {
        const response = await fetch("/api/update-task-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            routineId,
            taskKey,
            completed: newCompletedStatus,
          }),
        });
        if (!response.ok) {
          // Correct call to the state setter function to revert
          setActiveRoutines(originalActiveRoutines);
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to update task status (${response.status})`
          );
        }
      } catch (err: any) {
        console.error("Error updating task status:", err);
        alert(`Error updating task: ${err.message}`);
        // Correct call to the state setter function to revert
        setActiveRoutines(originalActiveRoutines);
      } finally {
        setUpdatingTaskId(null);
      }
    },
    [activeRoutines, updatingTaskId]
  ); // Depend on activeRoutines

  // --- Render Logic ---
  if (!isLoaded || isLoading) {
    // Still check isLoading primarily
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-center text-gray-600">
        Loading routines...
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 border rounded-md bg-red-50 text-center text-red-700">
        Error: {error}
      </div>
    );
  }
  if (!session) {
    return (
      <div className="p-4 border rounded-md bg-blue-50 text-center text-blue-700">
        Please log in to see routines.
      </div>
    );
  }
  // Check the *activeRoutines* state derived from filtering
  if (!activeRoutines || activeRoutines.length === 0) {
    return (
      <div className="p-4 border rounded-md bg-gray-50 text-center text-gray-600">
        No active routines found.
      </div>
    );
  }

  const todayStart = startOfDay(new Date());

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-700 mb-2">
        Your Active Routines
      </h2>
      {/* GUARD and map over activeRoutines state */}
      {Array.isArray(activeRoutines) &&
        activeRoutines.map((routine) => {
          // Group tasks by dayIndex
          const tasksByDay = (routine.tasks || []).reduce((acc, task) => {
            const day = task.dayIndex && task.dayIndex > 0 ? task.dayIndex : 1;
            if (!acc[day]) acc[day] = [];
            acc[day].push(task);
            return acc;
          }, {} as GroupedTasks);

          const startDate = parseISO(routine.routineDate);
          const duration = routine.duration ?? 1;

          return (
            // Routine Card Div
            <div
              key={routine._id}
              className="p-4 border rounded-md shadow-sm bg-white"
            >
              {/* Routine Header */}
              <h3 className="text-lg font-semibold mb-3 flex justify-between items-center">
                <span>Routine started {format(startDate, "MMM d, yy")}</span>
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    duration > 1
                      ? "bg-blue-100 text-blue-700"
                      : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {duration === 1 ? "Daily Focus" : `${duration}-Day Focus`}
                </span>
              </h3>
              {routine.insight && (
                <p className="text-sm italic text-gray-600 mb-4">
                  "{routine.insight}"
                </p>
              )}

              {/* Render Tasks Day by Day */}
              <div className="space-y-4">
                {Array.from({ length: duration }, (_, i) => i + 1).map(
                  (dayIndex) => {
                    const dayTasks = tasksByDay[dayIndex] || [];
                    const displayDate = addDays(startDate, dayIndex - 1);
                    const displayDateStart = startOfDay(displayDate);
                    const isFuture = isBefore(todayStart, displayDateStart);
                    const isToday = isEqual(todayStart, displayDateStart);

                    return (
                      // Day Section Wrapper
                      <div
                        key={`${routine._id}-day-${dayIndex}`}
                        className={`transition-opacity duration-300 ${isFuture ? "opacity-50 filter blur-[2px]" : ""}`}
                      >
                        {/* Day Header */}
                        <h4
                          className={`text-md font-semibold mb-1 pb-1 border-b ${isToday ? "text-blue-600 border-blue-200" : "text-gray-600 border-gray-200"}`}
                        >
                          Day {dayIndex} ({format(displayDate, "EEEE, MMM d")})
                          {isToday && (
                            <span className="text-xs font-normal text-blue-500 ml-2">
                              (Today)
                            </span>
                          )}
                          {isFuture && (
                            <span className="text-xs font-normal text-gray-400 ml-2">
                              (Upcoming)
                            </span>
                          )}
                        </h4>
                        {/* Tasks List for the Day */}
                        {dayTasks.length > 0 ? (
                          <ul className="space-y-1 pl-2 mt-2">
                            {dayTasks.map((task) => {
                              const isUpdatingThisTask =
                                updatingTaskId === task._key;
                              return (
                                <li
                                  key={task._key}
                                  className={`flex items-center p-1.5 rounded text-sm ${task.completed ? "bg-green-50" : ""} ${isUpdatingThisTask ? "opacity-60" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    id={`task-${task._key}`}
                                    checked={task.completed}
                                    disabled={isFuture || isUpdatingThisTask}
                                    onChange={() =>
                                      handleToggleComplete(
                                        routine._id,
                                        task._key
                                      )
                                    }
                                    className={`mr-2 h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-1 ${
                                      isFuture || isUpdatingThisTask
                                        ? "cursor-not-allowed opacity-50"
                                        : "cursor-pointer"
                                    }`}
                                  />
                                  <label
                                    htmlFor={`task-${task._key}`}
                                    className={`flex-grow ${task.completed ? "line-through text-gray-400" : "text-gray-800"} ${
                                      isFuture || isUpdatingThisTask
                                        ? "cursor-not-allowed"
                                        : "cursor-pointer"
                                    }`}
                                  >
                                    {task.description}
                                  </label>
                                </li>
                              );
                            })}
                          </ul>
                        ) : (
                          <p className="text-xs text-gray-400 pl-2 italic mt-1">
                            No tasks specifically assigned for this day.
                          </p>
                        )}
                      </div>
                    );
                  }
                )}
              </div>
            </div>
          );
        })}
    </div>
  );
}

export default ShowRoutine;

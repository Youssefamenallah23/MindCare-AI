// app/admin/page.tsx
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, SignedIn } from "@clerk/nextjs";
import { motion } from "motion/react";
import { HeroHighlight, Highlight } from "@/components/ui/hero-highlight";
// Import the refactored components
import { AdminStatsCards } from "./_components/AdminStatsCards"; // Adjust path if needed
import { UserSearchSection } from "./_components/UserSearchSection"; // Adjust path if needed
import { AdminListSection } from "./_components/AdminListSection"; // Adjust path if needed

// Shadcn UI for layout/fallbacks
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert } from "lucide-react";
import { WeeklyNewUsersChart } from "./_components/WeeklyNewUsersChart";
import Navbar from "@/components/navbar";
import { AdminSidebar } from "@/components/mini-component/AdminSidebar";
import { AdminNavbar } from "@/components/mini-component/AdminNavbar";
import { TooltipProvider } from "@/components/ui/tooltip";

export default function AdminPage() {
  const { session, isLoaded } = useSession();
  const [adminName, setAdminName] = useState<string>("User");
  const [isAdminUser, setIsAdminUser] = useState<boolean | null>(null); // null = checking
  const [isLoading, setIsLoading] = useState(true); // Initial loading for auth check
  const [error, setError] = useState<string | null>(null);
  const userName = adminName;
  // --- Check Admin Status ---
  // Fetches current user's profile to check role
  const checkAdminStatus = useCallback(async () => {
    // Prevent check if already determined or session not ready
    if (!isLoaded || !session || isAdminUser !== null) {
      if (!isLoaded) setIsLoading(true); // Ensure loading is true if Clerk isn't ready
      return;
    }

    console.log("Checking admin status...");
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/get-user-profile"); // Ensure this API exists
      if (!response.ok) {
        if (response.status === 404) {
          setIsAdminUser(false);
          return;
        } // No profile = not admin
        const errData = await response.json().catch(() => ({}));
        throw new Error(
          errData.error || `Failed status check (${response.status})`
        );
      }
      const data = await response.json();
      const isAdmin = data?.role === "admin";
      setIsAdminUser(isAdmin);
      console.log(`Admin check result: ${isAdmin}`);
      if (!isAdmin) setError("Access denied. Admin privileges required.");
    } catch (err: any) {
      console.error("Failed to check admin status:", err);
      setError("Could not verify admin status.");
      setIsAdminUser(false);
    } finally {
      setIsLoading(false);
    }
  }, [isLoaded, session, isAdminUser]); // Re-run if session changes

  // Once we know session is loaded & we have a clerkId, fetch full name
  useEffect(() => {
    if (isLoaded && session?.user?.id) {
      fetch("/api/get-user-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clerkId: session.user.id }),
      })
        .then(async (res) => {
          if (!res.ok) throw new Error(await res.text());
          return res.json();
        })
        .then(({ firstName, lastName }) => {
          setAdminName(`${firstName}` || "User");
        })
        .catch((err) => {
          console.error("Failed to fetch user name:", err);
        });
    }
  }, [isLoaded, session]);
  useEffect(() => {
    checkAdminStatus();
  }, [isLoaded, session, checkAdminStatus]);

  // --- Manage Role Handler (Passed down to AdminListSection) ---
  // This function performs the API call to update a user's role
  const handleSetRole = useCallback(
    async (targetUserId: string, makeAdmin: boolean): Promise<void> => {
      // Returns promise to allow child component to await completion & handle UI
      return new Promise<void>(async (resolve, reject) => {
        try {
          console.log(
            `Parent handleSetRole: Setting ${targetUserId} admin=${makeAdmin}`
          );
          const response = await fetch("/api/admin/manage-role", {
            // Ensure this API exists
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ targetUserId, makeAdmin }),
          });
          const result = await response.json();
          if (!response.ok) {
            // Throw error with message from backend if possible
            throw new Error(
              result.error || `Failed to update role (${response.status})`
            );
          }
          alert(result.message || "Role updated successfully!"); // Show success feedback
          resolve(); // Indicate success to caller
        } catch (err: any) {
          console.error("Failed to update role (parent handler):", err);
          alert(`Error updating role: ${err.message}`); // Show error feedback
          reject(err); // Indicate failure to caller
        }
      });
    },
    []
  ); // This function itself doesn't have dependencies

  // --- Render Logic ---

  // Initial loading state while checking admin status
  if (isLoading || isAdminUser === null) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        Verifying access...
      </div>
    );
  }

  // Not an admin - show unauthorized message
  if (!isAdminUser) {
    return (
      <div className="container mx-auto py-10 px-4 text-center">
        <Card className="max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center justify-center gap-2">
              <ShieldAlert /> Unauthorized
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{error || "You do not have permission to access this page."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Is an Admin - Render Admin Sections
  return (
    <SignedIn>
      <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
        {" "}
        {/* Main flex container */}
        {/* Sidebar */}
        <AdminSidebar />
        <main className="flex-1 ml-64 overflow-y-auto">
          <AdminNavbar />
          <div className="container mx-auto py-10 px-4 space-y-8 ">
            <HeroHighlight>
              <motion.h1
                initial={{
                  opacity: 0,
                  y: 20,
                }}
                animate={{
                  opacity: 1,
                  y: [20, -5, 0],
                }}
                transition={{
                  duration: 0.5,
                  ease: [0.4, 0.0, 0.2, 1],
                }}
                className="text-2xl px-4 md:text-3xl lg:text-5xl font-bold text-neutral-700 dark:text-white w-fit leading-relaxed lg:leading-snug text-center mx-auto "
              >
                Welcome back ,
                <Highlight className="text-black dark:text-white w-fit">
                  {userName}
                </Highlight>
              </motion.h1>
            </HeroHighlight>

            {/* Stats Section (Full Width) */}
            <AdminStatsCards />

            {/* Grid Row for Chart and Admin List */}
            {/* Uses grid, 3 columns on large screens (lg), 1 column on smaller screens */}
            <div className="flex flex-col lg:flex-row gap-8">
              {/* Left side - Chart */}
              <div className="w-full lg:w-1/2">
                <WeeklyNewUsersChart />
              </div>

              {/* Right side - Admin list & user search */}

              <div className="w-full lg:w-1/2 flex flex-col gap-8">
                <TooltipProvider>
                  <AdminListSection
                    isAdminUser={isAdminUser}
                    onSetRole={handleSetRole}
                  />
                  <UserSearchSection isAdminUser={isAdminUser} />{" "}
                </TooltipProvider>
              </div>
            </div>

            {/* Search Section (Full Width, below the grid row) */}
          </div>
        </main>
      </div>
    </SignedIn>
  );
}

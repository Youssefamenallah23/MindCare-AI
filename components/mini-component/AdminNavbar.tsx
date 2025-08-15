// app/admin/components/AdminNavbar.tsx
"use client";

import React from "react";
import UserProfile from "./UserProfile"; // Assuming UserProfile is in the same folder or adjust path
import { Separator } from "@/components/ui/separator"; // Optional separator

export function AdminNavbar() {
  // You could add dynamic titles or breadcrumbs here later if needed

  return (
    <header className="sticky top-0 z-30 flex h-fit items-center gap-4 border-b border-gradient-to-r from-violet-700 via-purple-500 to-pink-500  sm:static sm:h-24  sm:px-20 py-5">
      {/* Title on the left */}
      <div className="flex-1">
        <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-violet-700 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Admin Panel
        </h1>
      </div>

      {/* User Profile on the right */}
      <div className="flex items-center gap-4">
        {/* Add any other non-routing elements here if desired */}
        {/* Example: Maybe a help icon? */}
        {/* <Button variant="ghost" size="icon"><HelpCircle className="h-5 w-5" /></Button> */}

        {/* Separator before user profile (optional) */}
        {/* <Separator orientation="vertical" className="h-6" /> */}

        <UserProfile />
      </div>
    </header>
    // Removed Search, Theme Toggle, Notifications as requested
  );
}

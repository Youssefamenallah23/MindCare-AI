// Example Path: app/_components/NavMenu.tsx (adjust as needed)
"use client";

import React, { useEffect, useState } from "react";
// Import Menu and MenuItem from the library file
import { Menu, MenuItem } from "@/components/ui/navbar-menu"; // Assuming this path
import { useAuth } from "@clerk/nextjs";
import Link from "next/link"; // Import Link for navigation

// Props interface now includes active/setActive again
interface NavMenuProps {
  active: string | null;
  setActive: (active: string | null) => void;
}

export default function NavMenu({ active, setActive }: NavMenuProps) {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [errorRole, setErrorRole] = useState<string | null>(null);

  // Fetch user role (logic remains the same)
  useEffect(() => {
    const fetchUserRole = async () => {
      if (isAuthLoaded && userId) {
        setLoadingRole(true);
        setErrorRole(null);
        try {
          const response = await fetch(`/api/getUserRole`);
          if (response.ok) {
            const data = await response.json();
            setUserRole(data.role || "user");
          } else {
            const errorData = await response
              .json()
              .catch(() => ({ error: "Failed parse" }));
            setErrorRole(errorData.error || `Failed: ${response.statusText}`);
            console.error("Failed fetch role:", response.status, errorData);
            setUserRole("user");
          }
        } catch (error) {
          setErrorRole("Connection error");
          console.error("Error fetching role:", error);
          setUserRole("user");
        } finally {
          setLoadingRole(false);
        }
      } else if (isAuthLoaded && !userId) {
        setUserRole(null);
        setLoadingRole(false);
        setErrorRole(null);
      }
    };
    fetchUserRole();
  }, [userId, isAuthLoaded]);

  // Loading state (unchanged)
  if (loadingRole || !isAuthLoaded) {
    return (
      <div className="flex space-x-4 md:space-x-6 animate-pulse">
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-5 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  const isAdmin = userRole === "admin";

  // Use the Menu and MenuItem components
  return (
    // Pass setActive to the main Menu container for mouseleave reset
    <Menu setActive={setActive}>
      {/* Each top-level item is a MenuItem */}
      {/* It controls hover state via active/setActive */}
      <MenuItem setActive={setActive} active={active} item="Dashboard">
        {/* Since this is a simple link, use NextLink inside (or HoveredLink if it's just a styled Link) */}
        {/* If MenuItem itself should be the link, modify MenuItem component */}
        {/* Assuming MenuItem text is clickable, but we need link behavior */}
        <div className="flex flex-col space-y-4 text-sm text-indigo-600">
          {" "}
          {/* Wrapper needed if MenuItem doesn't render children directly */}
          <Link href="/dashboard" className="text-white hover:opacity-[0.8]">
            Dashboard Home
          </Link>
          {/* Add more dropdown items here if Dashboard had a sub-menu */}
        </div>
      </MenuItem>
      <MenuItem setActive={setActive} active={active} item="Mindy">
        <div className="flex flex-col space-y-4 text-sm">
          <Link href="/mindy" className="text-white hover:opacity-[0.8]">
            Chat with Mindy
          </Link>
        </div>
      </MenuItem>
      <MenuItem setActive={setActive} active={active} item="Profile">
        <button className="flex flex-col space-y-4 text-sm">
          <Link href="/profile" className="text-white hover:opacity-[0.8]">
            View Profile
          </Link>
        </button>
      </MenuItem>

      {/* Conditionally render Admin Panel MenuItem */}
      {isAdmin && (
        <MenuItem setActive={setActive} active={active} item="Admin Panel">
          <div className="flex flex-col space-y-4 text-sm">
            <Link href="/admin" className="text-white hover:opacity-[0.8]">
              Admin Dashboard
            </Link>
          </div>
        </MenuItem>
      )}
      {isAdmin && (
        <MenuItem setActive={setActive} active={active} item="Admin chatbot">
          <div className="flex flex-col space-y-4 text-sm">
            <Link href="/chatbot" className="text-white hover:opacity-[0.8]">
              Admin Dashboard
            </Link>
          </div>
        </MenuItem>
      )}
      {isAdmin && (
        <MenuItem setActive={setActive} active={active} item="DataBase studio">
          <div className="flex flex-col space-y-4 text-sm">
            <Link href="/studio" className="text-white hover:opacity-[0.8]">
              DataBase studio
            </Link>
          </div>
        </MenuItem>
      )}
    </Menu>
  );
}

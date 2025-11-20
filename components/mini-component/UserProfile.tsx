// app/_components/UserProfile.tsx (adjust path as needed)
"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession, SignedIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { createClient } from "@sanity/client";

// Import Shadcn UI components
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";

// --- WARNING: Client-side Sanity Client ---
// Ensure NEXT_PUBLIC_SANITY_API_TOKEN is read-only or dataset is public.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET;
const token = process.env.NEXT_PUBLIC_SANITY_API_TOKEN;

if (!projectId || !dataset) {
  console.error(
    "UserProfile: Missing NEXT_PUBLIC_SANITY_PROJECT_ID or NEXT_PUBLIC_SANITY_DATASET"
  );
}

const sanityClient = createClient({
  projectId: projectId || "missing_project_id",
  dataset: dataset || "missing_dataset",
  token: token,
  useCdn: !token,
  apiVersion: "2024-03-11",
});
// --- End Sanity Client ---

// Helper function to generate initials (unchanged)
const getInitials = (
  firstName?: string,
  lastName?: string,
  username?: string
): string => {
  if (firstName && lastName)
    return `${firstName[0]}${lastName[0]}`.toUpperCase();
  if (firstName) return firstName.slice(0, 2).toUpperCase();
  if (username) return username.slice(0, 2).toUpperCase();
  return "??";
};

// Interface matching Sanity schema (unchanged)
interface SanityUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  role: string;
  profileImage?: string;
}

// Default image path (unchanged)
const DEFAULT_AVATAR_PATH = "./images/image.jpg"; // Ensure this exists in /public/images/

export default function UserProfile() {
  const { session, isLoaded } = useSession();
  const { signOut } = useClerk();
  const router = useRouter();

  const [userData, setUserData] = useState<SanityUser | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Initialize loading true
  const [error, setError] = useState<string | null>(null);

  // Fetch user data directly from Sanity
  // useCallback with empty dependencies ensures stable function reference
  const fetchUserData = useCallback(async (clerkId: string) => {
    setIsLoading(true); // Set loading when fetch starts
    setError(null);
    try {
      const query = `*[_type == "users" && clerkId == $clerkId][0] {
        _id, firstName, lastName, username, role, profileImage
      }`;
      const params = { clerkId };

      const data = await sanityClient.fetch<SanityUser | null>(query, params);

      if (data) {
        setUserData(data);
      } else {
        console.warn(`No Sanity user profile found for Clerk ID: ${clerkId}.`);
        setError("Profile details not found.");
        setUserData(null);
      }
    } catch (err: any) {
      console.error("Failed to fetch user data from Sanity:", err);
      setError(err.message || "Failed to load profile data.");
      setUserData(null);
    } finally {
      setIsLoading(false); // Set loading false when fetch ends
    }
  }, []); // Empty dependency array is correct here

  // Effect to trigger fetch based on session status
  useEffect(() => {
    if (isLoaded) {
      if (session?.user?.id) {
        // Session loaded and user exists
        // Fetch only if userData is currently null (initial load or after logout)
        if (userData === null && !error) {
          // Added !error check

          fetchUserData(session.user.id);
        } else if (!isLoading && !userData && !error) {
          // Loaded, session exists, fetch finished but found no data (error state handles failure)

          setIsLoading(false); // Ensure loading is false
        } else if (!isLoading && userData) {
          // Data exists, ensure loading is false
          setIsLoading(false);
        }
      } else {
        // Clerk loaded, but no user session (logged out)

        setIsLoading(false);
        setUserData(null); // Clear user data
        setError(null); // Clear error
      }
    }
    // If !isLoaded, isLoading remains true
  }, [isLoaded, session, fetchUserData, userData, error, isLoading]); // Add relevant state vars

  // --- Rendering Logic ---
  const renderContent = () => {
    // Loading State
    if (!isLoaded || isLoading) {
      return (
        <div className="flex items-center gap-3 p-2 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"></div>
          <div className="space-y-1">
            <div className="h-4 w-24 rounded bg-gray-200 dark:bg-gray-700"></div>
            <div className="h-3 w-16 rounded bg-gray-200 dark:bg-gray-700"></div>
          </div>
        </div>
      );
    }

    // Error State
    if (error) {
      return (
        <div className="p-2 text-sm text-red-600" title={error}>
          Error loading profile.
        </div>
      );
    }

    // No User Data State (after loading & no error)
    if (!userData) {
      // This means isLoaded=true, session exists, isLoading=false, error=null, but fetch returned null
      return (
        <div className="p-2 text-sm text-gray-500">
          Profile data unavailable.
        </div>
      );
    }

    // Success State: Display User Info
    const displayName =
      userData.firstName || userData.lastName
        ? `${userData.firstName || ""} ${userData.lastName || ""}`.trim()
        : userData.username;
    const initials = getInitials(
      userData.firstName,
      userData.lastName,
      userData.username
    );
    const displayRole = userData.role
      ? userData.role.charAt(0).toUpperCase() + userData.role.slice(1)
      : "User";

    const imageSrc = userData.profileImage || DEFAULT_AVATAR_PATH;

    return (
      <DropdownMenuTrigger asChild>
        <div className="flex items-center gap-3 px-3 bg-transparent text-indigo-600 from-indigo-700 to-purple-800  shadow-input transition-colors duration-150  cursor-pointer outline-none  rounded-3xl p-2">
          <Avatar className="h-10 w-10  ">
            <AvatarImage
              src={imageSrc}
              alt={`${displayName}'s profile picture`}
            />
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-indigo-600 truncate">
              {displayName}
            </span>
            <span className="text-xs text-indigo-600">{displayRole}</span>
          </div>
        </div>
      </DropdownMenuTrigger>
    );
  };

  // Main component return
  return (
    <SignedIn>
      <DropdownMenu>
        {renderContent()}
        <DropdownMenuContent
          className="
      w-56 
      bg-white/70 backdrop-blur-md 
      rounded-2xl 
      shadow-xl 
      p-2 
      border border-purple-200/50 
      animate-fade-in
    "
          align="end"
        >
          <DropdownMenuLabel className="px-3 py-1 text-sm font-semibold text-indigo-600">
            My Account
          </DropdownMenuLabel>
          <DropdownMenuSeparator className="my-2 h-px bg-purple-200/50" />

          <DropdownMenuItem
            onClick={() => router.push("/profile")}
            className="
        flex items-center px-3 py-2 rounded-lg 
        hover:bg-indigo-100/60 
        focus:bg-indigo-100/80 
        transition-colors
        cursor-pointer
      "
          >
            <User className="mr-2 h-4 w-4 text-indigo-500" />
            <span className="text-gray-700">Profile</span>
          </DropdownMenuItem>

          <DropdownMenuSeparator className="my-2 h-px bg-purple-200/50" />

          <DropdownMenuItem
            onClick={() => signOut(() => router.push("/"))}
            className="
        flex items-center px-3 py-2 rounded-lg 
        hover:bg-red-100/60 
        focus:bg-red-100/80 
        transition-colors
        cursor-pointer
      "
          >
            <LogOut className="mr-2 h-4 w-4 text-red-500" />
            <span className="text-red-600">Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </SignedIn>
  );
}

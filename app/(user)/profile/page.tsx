// app/profile/page.tsx
"use client";

import {
  useEffect,
  useState,
  useCallback,
  ChangeEvent,
  FormEvent,
} from "react";
import { useSession, SignedIn, useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";

// Shadcn UI Imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Loader2, LogOut, LayoutDashboard, Settings } from "lucide-react"; // Added Settings icon

// --- Helper function to generate initials ---
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

// --- User data interface ---
interface UserProfileData {
  _id: string;
  firstName?: string;
  lastName?: string;
  username: string;
  role: string;
  profileImage?: string;
  email?: string; // Keep for display
}

// --- Default image path ---
const DEFAULT_AVATAR_PATH = "/images/image.jpg"; // Ensure this exists in /public/images/

// --- Main Component ---
export default function ProfilePage() {
  const { session, isLoaded } = useSession();
  const { signOut, openUserProfile } = useClerk();
  const router = useRouter();

  // --- State ---
  const [profileData, setProfileData] = useState<UserProfileData | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    username: "",
    profileImage: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Data Fetching ---
  const fetchUserProfile = useCallback(async () => {
    console.log("Profile Page: Fetching data...");
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/get-user-profile"); // Ensure this API exists
      const data = await response.json();
      if (!response.ok)
        throw new Error(
          data.error || `Failed profile fetch (${response.status})`
        );
      setProfileData(data as UserProfileData);
      setFormData({
        firstName: data.firstName || "",
        lastName: data.lastName || "",
        username: data.username || "",
        profileImage: data.profileImage || "",
      });
    } catch (err: any) {
      console.error("Failed to fetch user profile:", err);
      setError(err.message || "Failed to load profile.");
      setProfileData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isLoaded && session) {
      fetchUserProfile();
    } else if (isLoaded && !session) {
      setIsLoading(false);
    }
  }, [isLoaded, session, fetchUserProfile]);

  // --- Form Handling ---
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setSuccessMessage(null);
    setError(null);
  };

  const handleSaveProfile = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);
    try {
      const response = await fetch("/api/update-user-profile", {
        // Ensure this API exists
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.error || `Failed profile update (${response.status})`
        );
      setSuccessMessage("Profile updated successfully!");
      setProfileData((prev) => (prev ? { ...prev, ...formData } : null)); // Optimistic update
    } catch (err: any) {
      console.error("Failed to save profile:", err);
      setError(err.message || "Failed to save profile.");
    } finally {
      setIsSaving(false);
    }
  };

  // --- Render Logic ---

  if (!isLoaded || isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Loading profile...
      </div>
    );
  }
  if (error && !profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen text-red-600">
        Error: {error}
      </div>
    );
  }
  if (!session) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        Please log in to view your profile.
      </div>
    );
  }
  if (!profileData) {
    return (
      <div className="flex justify-center items-center min-h-screen text-gray-500">
        Could not find profile data.
      </div>
    );
  }

  // --- Main Profile Display and Form ---
  const initials = getInitials(
    profileData.firstName,
    profileData.lastName,
    profileData.username
  );
  // Use form data for preview, fallback to profile data, then default
  const imageSrc =
    formData.profileImage || profileData.profileImage || DEFAULT_AVATAR_PATH;
  const displayName =
    formData.firstName || formData.lastName
      ? `${formData.firstName} ${formData.lastName}`.trim()
      : formData.username;

  return (
    <SignedIn>
      {/* Page background gradient */}
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-indigo-200 via-purple-200 to-pink-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4 md:p-8">
        {/* Profile Card */}
        <Card className="w-full max-w-2xl shadow-2xl bg-white/80 backdrop-blur-lg dark:bg-gray-900/80 rounded-3xl border border-white/20 dark:border-gray-700/50">
          <CardHeader className="flex flex-row items-center gap-4 space-y-0 p-6 border-b border-gray-200 dark:border-gray-700/50">
            <Avatar className="h-20 w-20 border-2 border-white shadow-md">
              <AvatarImage src={imageSrc} alt="Profile picture" />
              <AvatarFallback className="text-2xl">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-grow">
              <CardTitle className="text-2xl font-bold text-gray-800 dark:text-gray-100">
                {displayName}
              </CardTitle>
              <CardDescription className="text-gray-600 dark:text-gray-400">
                @{profileData.username} - Update your profile details below.
              </CardDescription>
            </div>
            {/* Dropdown Menu Trigger */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <Settings className="h-5 w-5" />
                  <span className="sr-only">Account Menu</span>
                </Button>
              </DropdownMenuTrigger>

              <DropdownMenuContent
                align="end"
                className="
      w-48 
      bg-white/70 dark:bg-gray-900/70 
      backdrop-blur-md 
      border border-purple-200/50 dark:border-gray-700/50 
      rounded-2xl 
      shadow-xl 
      p-2 
      animate-fade-in
    "
              >
                <DropdownMenuLabel className="px-3 py-1 text-sm font-semibold text-indigo-600">
                  Account
                </DropdownMenuLabel>

                <DropdownMenuSeparator className="my-2 h-px bg-purple-200/50 dark:bg-gray-700/50" />
                {/* Change Password */}
                <DropdownMenuItem
                  onClick={() =>
                    openUserProfile({
                      path: "security", // opens the “Security” tab
                      routing: "modal", // in a modal window
                    })
                  }
                  className="flex items-center px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Change Password</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => router.push("/dashboard")}
                  className="
        flex items-center px-3 py-2 rounded-lg 
        hover:bg-indigo-100/60 dark:hover:bg-indigo-900/30 
        transition-colors cursor-pointer
      "
                >
                  <LayoutDashboard className="mr-2 h-4 w-4 text-indigo-500" />
                  <span className="text-gray-700 dark:text-gray-200">
                    Dashboard
                  </span>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2 h-px bg-purple-200/50 dark:bg-gray-700/50" />

                <DropdownMenuItem
                  onClick={() => signOut(() => router.push("/"))}
                  className="
        flex items-center px-3 py-2 rounded-lg 
        hover:bg-red-100/60 dark:hover:bg-red-900/30 
        transition-colors cursor-pointer
      "
                >
                  <LogOut className="mr-2 h-4 w-4 text-red-500" />
                  <span className="text-red-600 dark:text-red-400">
                    Log out
                  </span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSaveProfile} className="space-y-6">
              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label
                    htmlFor="firstName"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    First Name
                  </Label>
                  <Input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="bg-white/50 dark:bg-gray-800/50 rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="lastName"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Last Name
                  </Label>
                  <Input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="bg-white/50 dark:bg-gray-800/50 rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="username"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Username
                  </Label>
                  <Input
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    disabled={isSaving}
                    className="bg-white/50 dark:bg-gray-800/50 rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label
                    htmlFor="profileImage"
                    className="text-sm font-medium text-gray-700 dark:text-gray-300"
                  >
                    Profile Image URL
                  </Label>
                  <Input
                    id="profileImage"
                    name="profileImage"
                    type="url"
                    value={formData.profileImage}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    disabled={isSaving}
                    className="bg-white/50 dark:bg-gray-800/50 rounded-md"
                  />
                </div>
              </div>

              {/* Read-only Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email (from Clerk)
                  </Label>
                  <Input
                    value={
                      session.user.primaryEmailAddress?.emailAddress ?? "N/A"
                    }
                    readOnly
                    disabled
                    className="bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed rounded-md"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Role
                  </Label>
                  <Input
                    value={
                      profileData.role
                        ? profileData.role.charAt(0).toUpperCase() +
                          profileData.role.slice(1)
                        : "User"
                    }
                    readOnly
                    disabled
                    className="bg-gray-100 dark:bg-gray-700/50 cursor-not-allowed rounded-md"
                  />
                </div>
              </div>

              {/* Error/Success Messages */}
              <div className="h-5 text-center">
                {" "}
                {/* Adjusted height */}
                {error && (
                  <p className="text-sm text-red-500 dark:text-red-400">
                    {error}
                  </p>
                )}
                {successMessage && (
                  <p className="text-sm text-green-600 dark:text-green-400">
                    {successMessage}
                  </p>
                )}
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  type="submit"
                  disabled={isSaving}
                  className="bg-gradient-to-r from-indigo-500 to-pink-500 hover:from-pink-500 hover:to-indigo-500 text-white font-semibold shadow-md hover:shadow-lg transition-all rounded-full px-6 py-2"
                >
                  {isSaving && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {isSaving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </SignedIn>
  );
}

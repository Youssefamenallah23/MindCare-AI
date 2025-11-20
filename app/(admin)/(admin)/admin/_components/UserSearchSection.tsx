// app/admin/components/UserSearchSection.tsx
"use client";

import React, { useState, useCallback, FormEvent } from "react";
import { EditUserDialog } from "./EditUserDialog"; // Import the dialog component

// Shadcn UI Imports
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Search, Edit, Loader, UserPlus } from "lucide-react";

// date-fns
import { formatDistanceToNow, parseISO } from "date-fns";

// Interfaces (can be shared in types file)
interface AdminUserData {
  _id: string;
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
}
interface SearchedUser extends AdminUserData {
  profileImage?: string;
  lastActivityTimestamp?: string;
}
interface EditFormData {
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
}

// Helper Functions (can be shared)
const getInitials = (
  firstName?: string,
  lastName?: string,
  username?: string
): string => {
  /* ... */
};
const DEFAULT_AVATAR_PATH = "/images/image.jpg";

interface UserSearchSectionProps {
  isAdminUser: boolean;
  onSetRole: (targetUserId: string, makeAdmin: boolean) => Promise<void>; // Add onSetRole prop
}

export function UserSearchSection({
  isAdminUser,
  onSetRole,
}: UserSearchSectionProps) {
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchType, setSearchType] = useState<"email" | "clerkId">("email");
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);
  // Edit Dialog state
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<SearchedUser | null>(null);

  // Search Handler
  const handleSearch = useCallback(
    async (e?: FormEvent<HTMLFormElement>) => {
      e?.preventDefault();
      if (!searchQuery.trim() || !isAdminUser) return;
      setIsSearching(true);
      setSearchError(null);
      setSearchResults([]);
      try {
        const response = await fetch(
          `/api/admin/search-users?query=${encodeURIComponent(searchQuery)}&type=${searchType}`
        );
        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          throw new Error(
            errData.error || `Search failed (${response.status})`
          );
        }
        const data = await response.json();
        setSearchResults(Array.isArray(data) ? data : []);
        if (!Array.isArray(data) || data.length === 0) {
          setSearchError("No users found.");
        }
      } catch (err: any) {
        setSearchError(err.message);
      } finally {
        setIsSearching(false);
      }
    },
    [searchQuery, searchType, isAdminUser]
  );

  // Edit Dialog Trigger
  const handleOpenEditDialog = (user: SearchedUser) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  // Save Handler (calls API) - Passed to Dialog
  const handleSaveChanges = useCallback(
    async (userId: string, updates: EditFormData): Promise<boolean> => {
      try {
        // Ensure caller is still admin (redundant if page access is checked, but safe)
        if (!isAdminUser) throw new Error("Admin privileges required.");

        const response = await fetch("/api/admin/update-user-details", {
          // Ensure this API exists
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetUserId: userId, updates: updates }),
        });
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.error || "Failed to save user details");
        }
        alert("User details updated successfully!");
        // Refresh search results automatically after successful save
        await handleSearch(); // Use await if handleSearch is async
        return true; // Indicate success
      } catch (err: any) {
        console.error("Failed to save user details:", err);
        alert(`Error saving: ${err.message}`); // Show error to admin
        return false; // Indicate failure
      }
    },
    [isAdminUser, handleSearch]
  ); // handleSearch dependency will refresh results

  // --- NEW: Handle Make Admin Click ---
  const handleSetRoleClick = async (user: SearchedUser, makeAdmin: boolean) => {
    setIsUpdatingRole(user.clerkId); // Use clerkId for loading state
    try {
      const response = await fetch("/api/admin/update-user-role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clerkId: user.clerkId, // Send Clerk ID instead of Sanity _id
          newRole: makeAdmin ? "admin" : "user",
        }),
      });

      const textResponse = await response.text();
      const result = textResponse ? JSON.parse(textResponse) : {};

      if (!response.ok) {
        throw new Error(result.error || "Failed to update role");
      }

      // Update UI using Clerk ID
      setSearchResults((prevUsers) =>
        prevUsers.map((u) =>
          u.clerkId === user.clerkId ? { ...u, role: result.updatedRole } : u
        )
      );

      alert(`Role updated to ${makeAdmin ? "admin" : "user"} successfully!`);
    } catch (error: any) {
      console.error("Update failed:", error);
      alert(error.message);
    } finally {
      setIsUpdatingRole(null);
    }
  };
  return (
    <>
      <Card className="rounded-2xl border border-purple-300/40 shadow-2xl shadow-purple-200 bg-gradient-to-br from-white via-purple-50 to-purple-100">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl text-purple-900 font-extrabold flex items-center gap-2">
            <Search className="h-6 w-6 text-purple-500" />
            User Management
          </CardTitle>
          <CardDescription className="text-purple-600">
            Search users and manage their roles and profile details.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={handleSearch}
            className="flex flex-col sm:flex-row gap-3"
          >
            <Select
              value={searchType}
              onValueChange={(value: "email" | "clerkId") =>
                setSearchType(value)
              }
            >
              <SelectTrigger className="w-full sm:w-[140px] bg-white border-purple-300 text-purple-700 font-semibold">
                <SelectValue placeholder="Search by..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="clerkId">Clerk ID</SelectItem>
              </SelectContent>
            </Select>

            <Input
              type={searchType === "email" ? "email" : "text"}
              placeholder={
                searchType === "email"
                  ? "Enter user email..."
                  : "Enter Clerk ID..."
              }
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow border-purple-300 focus:ring-2 focus:ring-purple-500"
            />

            <Button
              type="submit"
              disabled={isSearching || !searchQuery.trim()}
              className="bg-gradient-to-tr from-purple-500 to-fuchsia-500 text-white shadow-md hover:brightness-110"
            >
              {isSearching ? (
                <Loader className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Search className="mr-2 h-4 w-4" />
              )}
              Search
            </Button>
          </form>

          {searchError && (
            <p className="mt-4 text-sm text-red-600 font-medium">
              {searchError}
            </p>
          )}
          {isSearching && (
            <p className="mt-4 text-sm text-purple-500 animate-pulse text-center">
              Searching for users...
            </p>
          )}
        </CardContent>
        {/* Search Results Table */}
        {!isSearching && searchResults.length > 0 && (
          <CardContent className="mt-6 pt-0">
            <h3 className="text-lg font-semibold text-purple-800 mb-2">
              🔍 Search Results
            </h3>
            <div className="rounded-xl overflow-hidden border border-purple-200 shadow-md">
              <Table className="text-sm text-purple-900">
                <TableHeader className="bg-gradient-to-r from-purple-100 via-fuchsia-100 to-purple-50">
                  <TableRow>
                    <TableHead className="text-purple-700">Avatar</TableHead>
                    <TableHead className="text-purple-700">Name</TableHead>
                    <TableHead className="text-purple-700">Email</TableHead>
                    <TableHead className="text-purple-700">Role</TableHead>
                    <TableHead className="text-purple-700">
                      Last Activity
                    </TableHead>
                    <TableHead className="text-right text-purple-700">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {searchResults.map((user) => (
                    <TableRow
                      key={user._id}
                      className="hover:bg-purple-50 transition-all duration-200"
                    >
                      <TableCell>
                        <Avatar className="h-9 w-9 border border-purple-300 shadow-sm">
                          <AvatarImage
                            src={user.profileImage || DEFAULT_AVATAR_PATH}
                            alt="User"
                          />
                          <AvatarFallback>
                            {getInitials(
                              user.firstName,
                              user.lastName,
                              user.username
                            )}
                          </AvatarFallback>
                        </Avatar>
                      </TableCell>
                      <TableCell className="font-medium">
                        {user.firstName || user.lastName
                          ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                          : user.username}
                      </TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            user.role === "admin" ? "destructive" : "secondary"
                          }
                          className={`uppercase px-2 py-1 rounded-full text-xs ${
                            user.role === "admin"
                              ? "bg-gradient-to-r from-pink-500 to-purple-600 text-white"
                              : "bg-purple-100 text-purple-700"
                          }`}
                        >
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-gray-500">
                        {user.lastActivityTimestamp
                          ? formatDistanceToNow(
                              parseISO(user.lastActivityTimestamp),
                              { addSuffix: true }
                            )
                          : "N/A"}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {/* Edit Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEditDialog(user)}
                          title="Edit User"
                          className="h-8 w-8 p-0 border-purple-300 hover:border-purple-500"
                        >
                          <span className="sr-only">Edit User</span>
                          <Edit className="h-4 w-4 text-purple-600" />
                        </Button>

                        {/* Make Admin Button */}
                        {user.role !== "admin" && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetRoleClick(user, true)}
                            disabled={isUpdatingRole === user.clerkId}
                            title="Make Admin"
                            className="h-8 w-8 p-0 border-purple-300 hover:border-purple-500"
                          >
                            <span className="sr-only">Make Admin</span>
                            {isUpdatingRole === user.clerkId ? (
                              <Loader className="h-4 w-4 animate-spin text-purple-600" />
                            ) : (
                              <UserPlus className="h-4 w-4 text-purple-600" />
                            )}
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        )}
      </Card>
      {/* Edit User Dialog - Rendered but controlled by state */}
      <EditUserDialog
        user={editingUser}
        isOpen={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={handleSaveChanges}
      />
    </>
  );
}

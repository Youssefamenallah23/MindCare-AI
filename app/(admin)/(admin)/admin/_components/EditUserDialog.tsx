// app/admin/components/EditUserDialog.tsx
"use client";

import React, { useState, useEffect, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";

// Interface for user data passed in
interface EditableUserData {
  _id: string;
  email?: string; // For display
  firstName?: string;
  lastName?: string;
  username?: string;
  profileImage?: string;
}

// Interface for form data
interface EditFormData {
  firstName: string;
  lastName: string;
  username: string;
  profileImage: string;
}

interface EditUserDialogProps {
  user: EditableUserData | null; // User data to edit
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (userId: string, updates: EditFormData) => Promise<boolean>; // Returns true on success
}

export function EditUserDialog({
  user,
  isOpen,
  onOpenChange,
  onSave,
}: EditUserDialogProps) {
  // State for form data within the dialog
  const [formData, setFormData] = useState<EditFormData>({
    firstName: "",
    lastName: "",
    username: "",
    profileImage: "",
  });
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Populate form when dialog opens or the user prop changes
  useEffect(() => {
    if (user && isOpen) {
      // Populate only when dialog is open and user is available
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        username: user.username || "", // Assuming username is required and exists
        profileImage: user.profileImage || "",
      });
      setEditError(null); // Clear previous errors when dialog opens
      setIsSavingEdit(false); // Reset saving state
    }
  }, [user, isOpen]); // Effect depends on user and isOpen

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    setEditError(null); // Clear error on input change
  };

  const handleSaveChanges = async () => {
    if (!user) return; // Should not happen if dialog is open, but safe check
    setIsSavingEdit(true);
    setEditError(null);
    try {
      const success = await onSave(user._id, formData); // Call parent save handler
      if (success) {
        onOpenChange(false); // Close dialog on successful save
      } else {
        // Keep dialog open on error, parent should show alert
        setEditError("Failed to save changes. Please try again.");
      }
    } catch (error) {
      // Catch errors from the onSave promise itself if it rejects unexpectedly
      console.error("Error during save operation:", error);
      setEditError("An unexpected error occurred during save.");
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Don't render the dialog's internals if not open or no user
  if (!isOpen || !user) {
    return null;
  }

  return (
    // Dialog component manages its own open state via onOpenChange
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        {" "}
        {/* Adjust width */}
        <DialogHeader>
          <DialogTitle>Edit User Profile</DialogTitle>
          <DialogDescription>
            Modify details for{" "}
            <span className="font-medium">{user.email || user.username}</span>.
            Click save when done.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Form Fields */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-firstName" className="text-right">
              First Name
            </Label>
            <Input
              id="edit-firstName"
              name="firstName"
              value={formData.firstName}
              onChange={handleInputChange}
              className="col-span-3"
              disabled={isSavingEdit}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-lastName" className="text-right">
              Last Name
            </Label>
            <Input
              id="edit-lastName"
              name="lastName"
              value={formData.lastName}
              onChange={handleInputChange}
              className="col-span-3"
              disabled={isSavingEdit}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-username" className="text-right">
              Username
            </Label>
            <Input
              id="edit-username"
              name="username"
              value={formData.username}
              onChange={handleInputChange}
              className="col-span-3"
              disabled={isSavingEdit}
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="edit-profileImage" className="text-right">
              Image URL
            </Label>
            <Input
              id="edit-profileImage"
              name="profileImage"
              type="url"
              placeholder="https://..."
              value={formData.profileImage}
              onChange={handleInputChange}
              className="col-span-3"
              disabled={isSavingEdit}
            />
          </div>
          {/* Display Error within Dialog */}
          {editError && (
            <p className="col-span-4 text-sm text-red-600 text-center pt-2">
              {editError}
            </p>
          )}
        </div>
        <DialogFooter>
          {/* Close button handled by onOpenChange */}
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSavingEdit}
          >
            Cancel
          </Button>
          <Button onClick={handleSaveChanges} disabled={isSavingEdit}>
            {isSavingEdit && <Loader className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

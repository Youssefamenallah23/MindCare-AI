"use client";

import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader, UserX } from "lucide-react";

interface AdminUserData {
  _id: string;
  clerkId: string;
  email: string;
  username: string;
  firstName?: string;
  lastName?: string;
  role: string;
}

interface AdminListSectionProps {
  isAdminUser: boolean;
  onSetRole: (targetUserId: string, makeAdmin: boolean) => Promise<void>;
}

export function AdminListSection({
  isAdminUser,
  onSetRole,
}: AdminListSectionProps) {
  const [adminsList, setAdminsList] = useState<AdminUserData[]>([]);
  const [isLoadingAdmins, setIsLoadingAdmins] = useState(false);
  const [adminsError, setAdminsError] = useState<string | null>(null);
  const [isUpdatingRole, setIsUpdatingRole] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    if (!isAdminUser) return;
    setIsLoadingAdmins(true);
    setAdminsError(null);
    try {
      const response = await fetch("/api/admin/list-admins");
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Failed fetch (${response.status})`);
      }
      const data = await response.json();
      setAdminsList(Array.isArray(data) ? data : []);
    } catch (err: any) {
      console.error("Failed to fetch admins list:", err);
      setAdminsError(err.message || "Failed to load admins.");
      setAdminsList([]);
    } finally {
      setIsLoadingAdmins(false);
    }
  }, [isAdminUser]);

  useEffect(() => {
    if (isAdminUser) {
      fetchAdmins();
    }
  }, [isAdminUser, fetchAdmins]);

  const handleSetRoleClick = async (
    targetUserId: string,
    makeAdmin: boolean
  ) => {
    setIsUpdatingRole(targetUserId);
    try {
      await onSetRole(targetUserId, makeAdmin);
      await fetchAdmins();
    } catch (error) {
      console.error("Role update failed (reported by parent)");
    } finally {
      setIsUpdatingRole(null);
    }
  };

  return (
    <Card className="rounded-2xl shadow-[0_8px_24px_rgba(128,90,213,0.3)] border border-purple-300/30 bg-gradient-to-br from-purple-100/30 to-white/20 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-xl font-semibold text-purple-700 flex items-center gap-2">
          🛡️ Admin Control Panel
        </CardTitle>
        <CardDescription className="text-sm text-muted-foreground">
          Manage users with elevated privileges.
        </CardDescription>
      </CardHeader>

      <CardContent className="overflow-auto max-h-[500px]">
        {isLoadingAdmins && (
          <p className="text-center text-sm text-muted-foreground">
            Loading admins...
          </p>
        )}
        {adminsError && (
          <p className="text-sm text-red-500 text-center">{adminsError}</p>
        )}
        {!isLoadingAdmins && !adminsError && adminsList.length === 0 && (
          <p className="text-center text-sm text-muted-foreground">
            No admins found.
          </p>
        )}
        {!isLoadingAdmins && !adminsError && adminsList.length > 0 && (
          <div className="border rounded-xl shadow-inner bg-white/30 backdrop-blur-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-background/60 backdrop-blur-md z-10">
                <TableRow>
                  <TableHead className="text-purple-800">Name</TableHead>
                  <TableHead className="text-purple-800">Email</TableHead>
                  <TableHead className="text-right text-purple-800">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adminsList.map((admin) => (
                  <TableRow
                    key={admin._id}
                    className="hover:bg-purple-50/50 transition"
                  >
                    <TableCell className="font-medium text-purple-900">
                      {admin.firstName || admin.lastName
                        ? `${admin.firstName || ""} ${admin.lastName || ""}`.trim()
                        : admin.username}
                    </TableCell>
                    <TableCell className="text-purple-800">
                      {admin.email}
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                disabled={isUpdatingRole === admin._id}
                                className="hover:bg-red-100 text-red-500 hover:text-red-700 transition-all"
                              >
                                {isUpdatingRole === admin._id ? (
                                  <Loader className="h-4 w-4 animate-spin" />
                                ) : (
                                  <UserX className="h-4 w-4" />
                                )}
                                <span className="sr-only">Revoke Admin</span>
                              </Button>
                            </DialogTrigger>
                          </TooltipTrigger>
                          <TooltipContent className="bg-white border shadow text-purple-500">
                            Revoke Admin
                          </TooltipContent>
                        </Tooltip>

                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle className="text-destructive">
                              Confirm Revoke
                            </DialogTitle>
                            <DialogDescription>
                              Are you sure you want to revoke admin access for{" "}
                              <span className="font-semibold">
                                {admin.email}
                              </span>
                              ?<br />
                              {"You can't remove yourself or the last admin."}
                            </DialogDescription>
                          </DialogHeader>
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button
                              variant="destructive"
                              disabled={isUpdatingRole === admin._id}
                              onClick={() =>
                                handleSetRoleClick(admin._id, false)
                              }
                            >
                              {isUpdatingRole === admin._id && (
                                <Loader className="mr-2 h-4 w-4 animate-spin" />
                              )}
                              Revoke Admin
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

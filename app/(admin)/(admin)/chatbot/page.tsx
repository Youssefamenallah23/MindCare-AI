// Example Path: app/chatbot-admin/page.tsx (or wherever AdminChatbot component resides)
"use client";

import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  ChangeEvent,
} from "react";
import Bubble from "@/app/_components/Bubble"; // Assuming Bubble component exists
import LoadingBubble from "@/app/_components/LoadingBubble"; // Assuming this exists
import { useChat } from "@ai-sdk/react";
// Removed unused Navbar import from this component's perspective
// import Navbar from "@/components/navbar";
import Image from "next/image"; // Keep if needed for logo elsewhere, but removed from this layout

// Shadcn UI Imports
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area"; // For file list if it gets long
import {
  Trash2,
  UploadCloud,
  SendHorizontal,
  Bot,
  Loader2,
} from "lucide-react"; // Icons
import Navbar from "@/components/navbar";

// --- Component Definition (Renamed to AdminChatbot) ---
function AdminChatbot() {
  // --- Chat Hook ---
  const { status, messages, input, handleInputChange, handleSubmit } = useChat({
    api: "/api/admin-chat", // Assuming admin chat uses the same API for now
  });

  // --- File Handling State ---
  const [uploadedFiles, setUploadedFiles] = useState<
    Array<{ filename: string; uploadedAt: string }>
  >([]);
  const [isFileLoading, setIsFileLoading] = useState(true); // Loading state for file list
  const [isUploading, setIsUploading] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  // --- Refs ---
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null); // Ref for file input

  // --- Utility Check ---
  const noMessages = !messages || messages.length === 0;

  // --- Scroll Logic ---
  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  // --- File Handling Logic ---
  const fetchFiles = useCallback(async () => {
    setIsFileLoading(true);
    setFileError(null);
    try {
      const response = await fetch("/api/files"); // Ensure this API exists
      if (!response.ok) throw new Error("Failed to fetch files");
      const data = await response.json();
      setUploadedFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("File fetch error:", error);
      setFileError("Failed to load files");
      setUploadedFiles([]);
    } finally {
      setIsFileLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchFiles(); // Fetch files on initial mount
  }, [fetchFiles]);

  const handleFileUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    setFileError(null);
    console.log("gufiseyhfuies", file);
    try {
      const response = await fetch("/api/upload", {
        // Ensure this API exists
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Upload failed: ${errorData || response.statusText}`);
      }
      await fetchFiles(); // Refresh file list
      alert("File uploaded successfully!");
    } catch (error) {
      console.error("Upload error:", error);
      alert(
        `File upload failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      setFileError("File upload failed.");
    } finally {
      setIsUploading(false);
      // Reset file input value
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleDelete = async (filename: string) => {
    if (!window.confirm(`Are you sure you want to delete ${filename}?`)) return;
    try {
      const response = await fetch(
        `/api/delete?filename=${encodeURIComponent(filename)}`, // Ensure this API exists
        { method: "DELETE" }
      );
      if (!response.ok) throw new Error("Delete failed");
      // Optimistic update
      setUploadedFiles((prev) => prev.filter((f) => f.filename !== filename));
      alert("File deleted successfully");
    } catch (error) {
      console.error("Delete error:", error);
      alert("Delete failed");
      fetchFiles(); // Refetch on error for consistency
    }
  };

  // Trigger file input click
  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // --- Component Return (Redesigned JSX) ---
  return (
    // Main container - centers content, provides background
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-violet-100 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Sticky Navbar */}
      <Navbar className="flex mt-3" />

      {/* Logo Section */}
      {/* Main Section */}
      <div className="flex flex-col md:flex-row justify-center items-start w-full gap-6 p-4 md:p-8">
        {/* File Management Panel */}
        <Card className="w-full md:w-1/3 lg:w-1/4 shadow-xl sticky top-24 bg-white dark:bg-gray-900 border border-purple-200 dark:border-gray-800 rounded-2xl">
          <CardHeader>
            <CardTitle className="text-purple-700 dark:text-purple-300">
              📁 Manage Files
            </CardTitle>
            <CardDescription>
              Upload or delete files for the chatbot context.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={triggerFileInput}
              disabled={isUploading}
              className="w-full mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white"
            >
              {isUploading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="mr-2 h-4 w-4" />
              )}
              {isUploading ? "Uploading..." : "Upload File"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.txt,.docx,.md"
              disabled={isUploading}
            />
            {fileError && (
              <p className="text-sm text-red-600 mb-2">{fileError}</p>
            )}
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              Uploaded Files:
            </h4>
            {isFileLoading ? (
              <p className="text-sm text-gray-500">Loading files...</p>
            ) : uploadedFiles.length === 0 ? (
              <p className="text-sm text-gray-500">No files uploaded.</p>
            ) : (
              <ScrollArea className="h-48 border rounded-md p-2 bg-gray-50 dark:bg-gray-800">
                <ul className="space-y-1">
                  {uploadedFiles.map((file) => (
                    <li
                      key={file.filename}
                      className="flex justify-between items-center text-sm p-1 hover:bg-purple-50 dark:hover:bg-gray-700 rounded"
                    >
                      <span
                        className="mr-2 break-words whitespace-normal max-w-[300px]"
                        title={file.filename}
                      >
                        {file.filename}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(file.filename)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-100/50 dark:hover:bg-red-900/30 h-6 w-6 p-0"
                        title="Delete file"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </CardContent>
        </Card>

        {/* Admin Chatbot Panel */}
        <Card className="w-full md:w-2/3 lg:flex-1 h-[85vh] md:h-[calc(100vh-8rem)] flex flex-col shadow-xl bg-white dark:bg-gray-900 border border-purple-200 dark:border-gray-800 rounded-2xl">
          {/* Chat Header */}
          <CardHeader className="flex flex-row items-center gap-3 border-b p-4 bg-gradient-to-r from-violet-100 via-white to-indigo-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-800 rounded-t-2xl">
            <Bot className="h-6 w-6 text-purple-600 dark:text-purple-300" />
            <CardTitle className="text-lg font-semibold text-purple-800 dark:text-purple-200">
              Admin Chatbot
            </CardTitle>
          </CardHeader>

          {/* Chat Messages Area */}
          <CardContent
            ref={chatContainerRef}
            className="flex-grow overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-800"
          >
            {messages.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 mt-10">
                Start admin chat...
              </p>
            ) : (
              messages.map((message) => (
                <Bubble key={message.id} message={message} />
              ))
            )}
            {status === "streaming" && <LoadingBubble />}
            <div className="h-2" />
          </CardContent>

          {/* Input Area */}
          <CardFooter className="p-4 border-t bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-b-2xl">
            <form
              onSubmit={handleSubmit}
              className="flex items-center gap-2 w-full"
            >
              <Input
                type="text"
                value={input}
                onChange={handleInputChange}
                placeholder="Enter admin command or query..."
                disabled={status !== "ready"}
                className="flex-grow bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-full px-4 py-2 focus:ring-2 focus:ring-purple-500 focus:border-transparent placeholder-gray-500 dark:placeholder-gray-400 text-foreground"
                autoComplete="off"
              />
              <Button
                type="submit"
                variant="default"
                size="icon"
                disabled={status !== "ready" || !input.trim()}
                className="bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white rounded-full disabled:opacity-50 flex-shrink-0"
              >
                <SendHorizontal className="h-5 w-5" />
                <span className="sr-only">Send Message</span>
              </Button>
            </form>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

// Rename export to match component name
export default AdminChatbot;

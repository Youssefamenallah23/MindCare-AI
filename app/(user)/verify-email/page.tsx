"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useSignUp } from "@clerk/nextjs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const VerifyEmailPage = () => {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { isLoaded, signUp, setActive } = useSignUp();

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isLoaded) {
      setError("Clerk is not loaded. Please try again.");
      return;
    }

    try {
      const result = await signUp.attemptEmailAddressVerification({ code });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });

        const tempUserData = JSON.parse(
          sessionStorage.getItem("tempUserData") || "{}"
        );

        const userData = {
          _type: "users",
          clerkId: result.createdUserId,
          email: tempUserData.email,
          username: tempUserData.email.split("@")[0],
          firstName: tempUserData.firstName,
          lastName: tempUserData.lastName,
          role: "user",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        const response = await fetch("/api/add-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(userData),
        });

        if (!response.ok) {
          throw new Error("Failed to create user in Sanity");
        }

        sessionStorage.removeItem("tempUserData");

        router.push("/dashboard");
      } else {
        setError("Verification failed. Please try again.");
      }
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message || "An error occurred. Please try again."
      );
      console.error("Verification error:", err);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-indigo-200 via-blue-200 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 animate-fade-in">
      <div className="w-full max-w-md bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-3xl shadow-2xl p-8 space-y-6">
        <h1 className="text-3xl font-bold text-center bg-gradient-to-r from-indigo-500 via-blue-500 to-purple-500 bg-clip-text text-transparent">
          Almost There! 🎯
        </h1>
        <p className="text-center text-gray-600 dark:text-gray-300">
          Enter the code we sent to your email 📧
        </p>

        <form onSubmit={handleVerify} className="space-y-4">
          {error && <p className="text-red-500 text-center">{error}</p>}
          <Input
            type="text"
            placeholder="Enter verification code"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            required
            className="rounded-xl focus:ring-2 focus:ring-green-400"
          />
          <Button
            type="submit"
            className="w-full rounded-full bg-gradient-to-r from-indigo-400 via-blue-400 to-purple-400 hover:scale-105 transform transition-all duration-300 text-white shadow-lg"
          >
            🚀 Verify & Continue
          </Button>
        </form>
      </div>
    </div>
  );
};

export default VerifyEmailPage;

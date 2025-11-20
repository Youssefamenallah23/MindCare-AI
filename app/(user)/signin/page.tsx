"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useSignIn } from "@clerk/nextjs";
import { useForm, SubmitHandler } from "react-hook-form";

type FormValues = {
  emailAddress: string;
  password: string;
};

const SignInForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isLoaded, signIn, setActive } = useSignIn();

  const router = useRouter();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!isLoaded) {
      setError("Clerk is not loaded. Please try again.");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn.create({
        identifier: data.emailAddress,
        password: data.password,
      });

      if (result.status === "complete") {
        // ✅ set the active session
        await setActive({ session: result.createdSessionId });

        // ✅ redirect using Next.js router
        router.push("/dashboard"); // or /mindy
      } else {
        setError("Sign-in not complete. Please try again.");
      }
      setLoading(false);
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message ||
          "Invalid email or password. Please try again."
      );
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-pink-200 via-purple-200 to-blue-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl rounded-3xl bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 p-6 space-y-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 bg-clip-text text-transparent">
            Welcome Back ✨
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Sign in to continue your journey toward growth 🌱
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {error && <p className="text-red-500 text-center">{error}</p>}
            <div className="grid gap-2">
              <Label
                htmlFor="email"
                className="text-sm text-gray-700 dark:text-gray-200"
              >
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                {...register("emailAddress", { required: "Email is required" })}
                className="rounded-xl focus:ring-2 focus:ring-pink-400"
              />
              {errors.emailAddress && (
                <p className="text-red-500 text-sm">
                  {errors.emailAddress.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="password"
                className="text-sm text-gray-700 dark:text-gray-200"
              >
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Your secret password"
                {...register("password", { required: "Password is required" })}
                className="rounded-xl focus:ring-2 focus:ring-purple-400"
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button
              disabled={loading}
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:scale-105 transform transition-all duration-300 shadow-lg text-white"
            >
              {loading ? "loading...." : "🚀 Sign In"}
            </Button>
          </form>
          <div id="clerk-captcha" className="pt-4"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInForm;

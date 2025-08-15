"use client";
import React from "react";
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
import { useSignUp } from "@clerk/nextjs";
import { useForm, SubmitHandler } from "react-hook-form";

type FormValues = {
  emailAddress: string;
  password: string;
  firstName: string;
  lastName: string;
};

const SignUpForm = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>();
  const [error, setError] = React.useState<string | null>(null);
  const router = useRouter();
  const { isLoaded, signUp } = useSignUp();

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    if (!isLoaded) {
      setError("Clerk is not loaded. Please try again.");
      return;
    }

    try {
      const result = await signUp.create({
        emailAddress: data.emailAddress,
        password: data.password,
      });

      const userData = {
        email: data.emailAddress,
        firstName: data.firstName,
        lastName: data.lastName,
      };
      sessionStorage.setItem("tempUserData", JSON.stringify(userData));

      await signUp.prepareEmailAddressVerification({
        strategy: "email_code",
      });

      router.push("/verify-email");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.message || "An error occurred. Please try again."
      );
      console.error("Signup error:", err);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-200 via-purple-200 to-pink-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-6 animate-fade-in">
      <Card className="w-full max-w-md shadow-2xl rounded-3xl bg-white/80 backdrop-blur-lg dark:bg-gray-800/80 p-6 space-y-6">
        <CardHeader className="text-center">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Create Your Account 🌟
          </CardTitle>
          <CardDescription className="text-gray-600 dark:text-gray-300">
            Start your journey to better days 💬
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
                className="rounded-xl focus:ring-2 focus:ring-blue-400"
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
                placeholder="Create a strong password"
                {...register("password", { required: "Password is required" })}
                className="rounded-xl focus:ring-2 focus:ring-purple-400"
              />
              {errors.password && (
                <p className="text-red-500 text-sm">
                  {errors.password.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="firstName"
                className="text-sm text-gray-700 dark:text-gray-200"
              >
                First Name
              </Label>
              <Input
                id="firstName"
                placeholder="Your first name"
                {...register("firstName", {
                  required: "First name is required",
                })}
                className="rounded-xl focus:ring-2 focus:ring-pink-400"
              />
              {errors.firstName && (
                <p className="text-red-500 text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label
                htmlFor="lastName"
                className="text-sm text-gray-700 dark:text-gray-200"
              >
                Last Name
              </Label>
              <Input
                id="lastName"
                placeholder="(optional)"
                {...register("lastName")}
                className="rounded-xl focus:ring-2 focus:ring-pink-400"
              />
            </div>
            <Button
              type="submit"
              className="w-full rounded-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 hover:scale-105 transform transition-all duration-300 shadow-lg text-white"
            >
              🎉 Create Account
            </Button>
          </form>
          <div id="clerk-captcha" className="pt-4"></div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignUpForm;

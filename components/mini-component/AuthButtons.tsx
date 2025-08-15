"use client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function AuthButtons() {
  const router = useRouter();

  return (
    <div className="flex justify-end items-center gap-4 lg:mr-6 max-md:hidden">
      <Button
        size="lg"
        className="rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg hover:scale-105 transition-transform"
        onClick={() => router.push("/signin")}
      >
        <p className="text-white">✨ Sign In</p>
      </Button>
      <Button
        size="lg"
        className="rounded-full bg-gradient-to-r from-indigo-300 to-purple-400  shadow-lg hover:scale-105 transition-transform"
        onClick={() => router.push("/signup")}
      >
        <p className="text-white">🚀 Sign Up</p>
      </Button>
    </div>
  );
}

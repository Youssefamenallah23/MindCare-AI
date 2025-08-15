"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/signin");
  }, [router]);

  return null; // Or a loader/spinner if you prefer
}

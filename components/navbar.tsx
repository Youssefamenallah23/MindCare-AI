"use client";
import React, { useState } from "react";
import logo from "../public/images/logo1.png";
import { cn } from "@/lib/utils";
import { SignedOut } from "@clerk/nextjs";

import NavMenu from "./mini-component/NavMenu";
import UserProfile from "./mini-component/UserProfile";
import AuthButtons from "./mini-component/AuthButtons";
import { Button } from "./ui/button";
import Image from "next/image";

export default function Navbar({ className }: { className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  return (
    <div className={cn("top-10 inset-x-0 z-50 h-24 shadow", className)}>
      <div className=" w-1/3  max-md:w-full flex flex-row items-center justify-between ">
        <Image
          src={logo}
          alt="image "
          className="w-64 h-8 max-sm:w-48 max-sm:h-8 xl:ml-10"
        />{" "}
        {/* Pass logo and alt as props */}
      </div>
      <div className="w-full max-lg:hidden ">
        <NavMenu active={active} setActive={setActive} />
      </div>
      <div className="w-1/3 max-lg:flex-1 flex justify-end items-center">
        <UserProfile />
        <SignedOut>
          <AuthButtons />
        </SignedOut>
      </div>
    </div>
  );
}

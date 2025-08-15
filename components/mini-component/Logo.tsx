"use client";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface LogoProps {
  src: string;
  alt: string;
  className?: string;
}

export const Logo = ({ src, alt, className }: LogoProps) => {
  return (
    <Image
      src={src}
      alt={alt}
      className={cn("w-72 h-8 max-sm:w-48 max-sm:h-4 lg:ml-4", className)}
      width={200} // Add width and height for Next.js Image
      height={50}
    />
  );
};

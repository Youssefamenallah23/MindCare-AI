// app/admin/components/AdminSidebar.tsx
"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useClerk } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils"; // Assuming you have shadcn/ui utils
import {
  LayoutDashboard,
  Bot,
  Database,
  BarChart3,
  UserCircle,
  MessageSquareText,
} from "lucide-react";
// Import Icons from lucide-react
import { LogOut } from "lucide-react";
import logo from "../../public/images/logo1.png"; // Adjust path to your logo

// Interface for navigation links
interface NavLink {
  href: string;
  label: string;
  icon: React.ElementType; // Icon component
}

export function AdminSidebar({ className }: { className?: string }) {
  const pathname = usePathname(); // Get current path for active styling
  const { signOut } = useClerk();
  const router = useRouter();

  const topNavLinks: NavLink[] = [
    { href: "/admin", label: "Admin Panel", icon: LayoutDashboard },
    { href: "/chatbot", label: "Admin Chatbot", icon: Bot },
    { href: "/studio", label: "Studio", icon: Database },
    { href: "/dashboard", label: "User Dashboard", icon: BarChart3 },
    { href: "/mindy", label: "Mindy AI", icon: MessageSquareText },
    { href: "/profile", label: "Manage Profile", icon: UserCircle },
  ];

  const bottomNavLinks: NavLink[] = [
    // Example: { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  const handleSignOut = () => {
    signOut(() => router.push("/")); // Redirect to home after sign out
  };

  return (
    <aside
      className={cn(
        "h-screen w-64 flex flex-col fixed left-0 top-0 z-40", // Fixed position
        "bg-gradient-to-b from-indigo-700 to-purple-800 text-white", // Gradient background
        "border-r border-indigo-900/50", // Subtle border
        className
      )}
    >
      {/* Logo Section */}
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        {/* Replace with your actual logo */}
        <div className="flex items-center justify-center w-full h-8 rounded-full my-4">
          <Image
            src={logo} // Replace with your logo path
            alt="Logo"
            className=" w-full h-full "
          />
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-grow p-4 space-y-5 overflow-y-auto">
        {topNavLinks.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/admin" && pathname.startsWith(link.href));
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "hover:bg-white/20 hover:text-white", // Hover state
                isActive ? "bg-white/10 text-white" : "text-indigo-100" // Active state
              )}
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Bottom Links (Settings, Logout) */}
      <div className="p-4 border-t border-white/10 space-y-2">
        {bottomNavLinks.map((link) => {
          const isActive = pathname === link.href;
          return (
            <Link
              key={link.label}
              href={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                "hover:bg-white/20 hover:text-white",
                isActive ? "bg-white/10 text-white" : "text-indigo-100"
              )}
            >
              <link.icon className="h-5 w-5 flex-shrink-0" />
              <span>{link.label}</span>
            </Link>
          );
        })}
        {/* Logout Button */}
        <button
          onClick={handleSignOut}
          className={cn(
            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors w-full text-left",
            "hover:bg-red-500/30 hover:text-white text-indigo-100"
          )}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" />
          <span>Log Out</span>
        </button>
      </div>
    </aside>
  );
}

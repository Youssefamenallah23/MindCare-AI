import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserRoleByClerkId } from "./sanity/lib/queries";

const publicRoutes = createRouteMatcher([
  "/",
  "/signin(.*)",
  "/signup(.*)",
  "/verify-email(.*)",
]);

const adminRoutes = createRouteMatcher(["/studio(/.*)?", "/chatbot(/.*)?"]);

export default clerkMiddleware(async (auth, req) => {
  const authResult = await auth();
  const userId = authResult.userId;
  const pathname = req.nextUrl.pathname;

  console.log("Middleware: Current URL:", req.url);
  console.log("Middleware: User ID:", userId);

  // Exclude /dashboard from middleware checks initially.
  /*
  if (pathname === "/dashboard") {
    console.log("Middleware: /dashboard route, skipping checks.");
    return NextResponse.next();
  }
*/
  if (!userId && !publicRoutes(req)) {
    console.log("Middleware: User not logged in, redirecting to /signin.");
    const signInUrl = new URL("/signin", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId && adminRoutes(req)) {
    console.log(
      `Middleware: User ${userId} attempting admin route: ${pathname}`
    );
    const userRole = await getUserRoleByClerkId(userId);
    console.log("Middleware: User Role from Sanity:", userRole);

    if (userRole !== "admin") {
      console.log(
        `Middleware: Redirecting user ${userId} with role '${userRole}' from admin route.`
      );
      const homeUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(homeUrl);
    }
    console.log(
      `Middleware: Allowing user ${userId} with role 'admin' access to admin route.`
    );
  }

  console.log("Middleware: Allowing request to proceed.");
  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};

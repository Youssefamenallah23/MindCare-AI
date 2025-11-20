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

  // Exclude /dashboard from middleware checks initially.
  /*
  if (pathname === "/dashboard") {
     "Middleware: /dashboard route, skipping checks.");
    return NextResponse.next();
  }
*/
  if (!userId && !publicRoutes(req)) {
    const signInUrl = new URL("/signin", req.url);
    return NextResponse.redirect(signInUrl);
  }

  if (userId && adminRoutes(req)) {
    const userRole = await getUserRoleByClerkId(userId);

    if (userRole !== "admin") {
      const homeUrl = new URL("/dashboard", req.url);
      return NextResponse.redirect(homeUrl);
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
    "/(api|trpc)(.*)",
  ],
};

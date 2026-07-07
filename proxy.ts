import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const PUBLIC_PATHS = new Set(["/", "/sign-in", "/sign-up"]);

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isPublicPath = PUBLIC_PATHS.has(req.nextUrl.pathname);

  if (!isLoggedIn && !isPublicPath) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  if (isLoggedIn && (req.nextUrl.pathname === "/sign-in" || req.nextUrl.pathname === "/sign-up")) {
    return NextResponse.redirect(new URL("/games", req.nextUrl));
  }
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};

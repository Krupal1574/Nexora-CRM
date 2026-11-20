import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const authCookie = request.cookies.get("nexora_auth_user")?.value;

  const isLoginPage = pathname === "/login";

  // If user is not authenticated and trying to access any protected page
  if (!authCookie && !isLoginPage) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") {
      loginUrl.searchParams.set("redirect", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  // If user is already authenticated and visits /login
  if (authCookie && isLoginPage) {
    const redirectParam = request.nextUrl.searchParams.get("redirect") || "/";
    return NextResponse.redirect(new URL(redirectParam, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (e.g. /api/health)
     * - _next/static (static assets)
     * - _next/image (image optimization files)
     * - favicon.ico, favicon.png, image extensions
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|favicon\\.png|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

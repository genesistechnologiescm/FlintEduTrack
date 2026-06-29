import { NextResponse, type NextRequest } from "next/server";

// Edge-safe auth gate. Middleware runs on the Edge runtime, so we do NOT create
// a Supabase client here (its realtime client needs a WebSocket that Edge
// doesn't provide). Instead we cheaply check for the Supabase session cookie and
// redirect to /login if it's absent. Real verification happens server-side:
// every protected action calls supabase.auth.getUser() (Node runtime) and RLS
// enforces access at the database.
export function middleware(request: NextRequest) {
  const hasSession = request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));

  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/attendance/:path*", "/parent/:path*"],
};

import { NextResponse, type NextRequest } from "next/server";
import { createMiddlewareSupabaseClient } from "@/shared/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });
  const supabase = createMiddlewareSupabaseClient(request, response);

  // Refresh session — must be called before any auth checks
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Protect /record — unauthenticated users are redirected to /
  if (request.nextUrl.pathname.startsWith("/record") && !user) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mediapipe).*)"],
};

// Client-side only (safe to import in Client Components)
export { getSupabaseBrowserClient } from "./client";
export { AuthProvider, useAuth } from "./AuthProvider";

// Server-side utilities are imported directly by path (not via this barrel)
// to prevent next/headers from leaking into the client bundle:
//   import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
//   import { createMiddlewareSupabaseClient } from "@/shared/lib/supabase/middleware";

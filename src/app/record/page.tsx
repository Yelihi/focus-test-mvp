import { createServerSupabaseClient } from "@/shared/lib/supabase/server";
import { RecordPageClient } from "@/views/record/ui";
import { toSessionHistoryEntry } from "@/entities/focus-session/services/mappers";
import type { SessionRow, BreakLogRow } from "@/entities/focus-session/services/mappers";

export default async function RecordPage() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    // Middleware handles redirect, but guard here as well
    return null;
  }

  const { data: rows } = await supabase
    .from("sessions")
    .select("*, break_logs(*)")
    .eq("user_id", user.id)
    .order("started_at", { ascending: false });

  const sessions = (rows ?? []).map((row) =>
    toSessionHistoryEntry(row as SessionRow & { break_logs: BreakLogRow[] }),
  );

  return <RecordPageClient initialSessions={sessions} />;
}

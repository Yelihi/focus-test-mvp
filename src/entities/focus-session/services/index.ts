export { IndexedDbSessionRepository } from "./IndexedDbSessionRepository";
export { SupabaseSessionRepository } from "./SupabaseSessionRepository";
export { CompositeSessionRepository } from "./CompositeSessionRepository";

import type { SupabaseClient } from "@supabase/supabase-js";
import { IndexedDbSessionRepository } from "./IndexedDbSessionRepository";
import { SupabaseSessionRepository } from "./SupabaseSessionRepository";
import { CompositeSessionRepository } from "./CompositeSessionRepository";
import type { SessionRepository } from "../models/repository";

interface CreateRepositoryOptions {
  isAuthenticated?: boolean;
  supabase?: SupabaseClient;
  userId?: string;
}

export function createSessionRepository(
  options?: CreateRepositoryOptions,
): SessionRepository {
  const local = new IndexedDbSessionRepository();
  const remote =
    options?.isAuthenticated && options.supabase && options.userId
      ? new SupabaseSessionRepository(options.supabase, options.userId)
      : null;
  return new CompositeSessionRepository(local, remote);
}

export async function cleanupExpiredLocalSessions(maxAgeMs: number): Promise<void> {
  const repo = new IndexedDbSessionRepository();
  await repo.cleanupExpiredSessions(maxAgeMs);
}

export type { SessionRepository } from "./sessionRepository";
export { IndexedDbSessionRepository } from "./indexedDb";

import { IndexedDbSessionRepository } from "./indexedDb";
import type { SessionRepository } from "./sessionRepository";

let instance: SessionRepository | null = null;

export function createSessionRepository(): SessionRepository {
  if (!instance) {
    instance = new IndexedDbSessionRepository();
  }
  return instance;
}

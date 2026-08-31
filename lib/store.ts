import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  SessionStore,
  createDemoSessions,
  type DeviceSession,
} from "./sessions";

const DATA_FILE = path.join(process.cwd(), "data", "sessions.json");
const USER_ID = "user_saeed_demo";

const SEED_TOKENS: Record<string, string> = {
  sess_laptop_01: "seed_laptop_refresh_v1",
  sess_phone_02: "seed_phone_refresh_v1",
  sess_tablet_03: "seed_tablet_refresh_v1",
};

type StoreFile = {
  sessions: DeviceSession[];
};

const g = globalThis as unknown as {
  __sessionScopeStore?: SessionStore;
  __sessionScopeLiveTokens?: Record<string, string>;
};

function readSessions(): DeviceSession[] {
  try {
    const raw = JSON.parse(readFileSync(DATA_FILE, "utf8")) as StoreFile;
    if (!Array.isArray(raw.sessions)) throw new Error("invalid");
    return raw.sessions;
  } catch {
    const sessions = createDemoSessions(USER_ID);
    writeSessions(sessions);
    return sessions;
  }
}

export function writeSessions(sessions: DeviceSession[]): void {
  mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  writeFileSync(
    DATA_FILE,
    `${JSON.stringify({ sessions }, null, 2)}\n`,
  );
}

export function getSessionStore(): SessionStore {
  if (!g.__sessionScopeStore) {
    g.__sessionScopeStore = new SessionStore(readSessions());
  }
  return g.__sessionScopeStore;
}

export function persistSessions(): void {
  const store = getSessionStore();
  // Re-read all known demo + any others via list — SessionStore only exposes list by user
  writeSessions(store.list(USER_ID));
}

export function getLiveTokens(): Record<string, string> {
  if (!g.__sessionScopeLiveTokens) {
    g.__sessionScopeLiveTokens = { ...SEED_TOKENS };
  }
  return g.__sessionScopeLiveTokens;
}

export function setLiveToken(sessionId: string, raw: string | null): void {
  const tokens = getLiveTokens();
  if (raw === null) {
    delete tokens[sessionId];
  } else {
    tokens[sessionId] = raw;
  }
}

export function getSeedToken(sessionId: string): string | undefined {
  return SEED_TOKENS[sessionId];
}

export { USER_ID };

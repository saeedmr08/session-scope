import { NextResponse } from "next/server";

import {
  USER_ID,
  getLiveTokens,
  getSessionStore,
  persistSessions,
  setLiveToken,
} from "@/lib/store";

export async function POST() {
  const store = getSessionStore();
  const count = store.revokeAll(USER_ID);
  for (const id of Object.keys(getLiveTokens())) {
    setLiveToken(id, null);
  }
  persistSessions();
  return NextResponse.json({ ok: true, revoked: count });
}

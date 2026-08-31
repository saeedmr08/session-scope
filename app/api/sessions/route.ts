import { NextResponse } from "next/server";

import {
  USER_ID,
  getLiveTokens,
  getSessionStore,
  persistSessions,
} from "@/lib/store";

export async function GET() {
  const store = getSessionStore();
  return NextResponse.json({
    userId: USER_ID,
    sessions: store.list(USER_ID),
    liveTokenSessionIds: Object.keys(getLiveTokens()),
  });
}

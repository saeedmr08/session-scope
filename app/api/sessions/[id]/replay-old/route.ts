import { NextResponse } from "next/server";

import {
  USER_ID,
  getSeedToken,
  getSessionStore,
  persistSessions,
  setLiveToken,
} from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

/** Replay a known old seed token to demonstrate reuse detection. */
export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const seed = getSeedToken(id);
  if (!seed) {
    return NextResponse.json(
      { status: "rejected", reason: "unknown", error: "no seed for session" },
      { status: 404 },
    );
  }

  const store = getSessionStore();
  const result = store.rotate(seed);
  if (result.status === "ok") {
    setLiveToken(id, result.issued.rawToken);
  } else if (result.reason === "reuse_detected") {
    for (const session of store.list(USER_ID)) {
      if (session.status === "reuse_killed") setLiveToken(session.id, null);
    }
  }
  persistSessions();
  return NextResponse.json(result);
}

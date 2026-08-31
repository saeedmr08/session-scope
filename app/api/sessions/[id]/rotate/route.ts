import { NextResponse } from "next/server";

import {
  USER_ID,
  getLiveTokens,
  getSessionStore,
  persistSessions,
  setLiveToken,
} from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { rawToken?: string };
  const store = getSessionStore();
  const live = getLiveTokens();
  const rawToken = body.rawToken?.trim() || live[id];

  if (!rawToken) {
    return NextResponse.json(
      { status: "rejected", reason: "unknown", error: "no rawToken available" },
      { status: 400 },
    );
  }

  const result = store.rotate(rawToken);
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

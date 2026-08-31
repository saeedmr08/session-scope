import { NextResponse } from "next/server";

import {
  USER_ID,
  getSessionStore,
  persistSessions,
  setLiveToken,
} from "@/lib/store";

type Ctx = { params: Promise<{ id: string }> };

export async function POST(_req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const store = getSessionStore();
  const ok = store.revokeOne(USER_ID, id);
  if (ok) setLiveToken(id, null);
  persistSessions();
  return NextResponse.json({ ok, session: store.get(id) ?? null });
}

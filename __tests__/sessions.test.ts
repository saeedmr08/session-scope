import { describe, expect, it } from "vitest";
import { SessionStore, createDemoSessions } from "@/lib/sessions";

describe("SessionStore revoke", () => {
  it("lists demo devices for the user", () => {
    const store = new SessionStore();
    const sessions = store.list("user_saeed_demo");
    expect(sessions.length).toBe(3);
    expect(sessions.every((s) => s.status === "active")).toBe(true);
  });

  it("revokes a single session without touching others", () => {
    const store = new SessionStore();
    const ok = store.revokeOne("user_saeed_demo", "sess_phone_02");
    expect(ok).toBe(true);

    const phone = store.get("sess_phone_02");
    expect(phone?.status).toBe("revoked");
    expect(phone?.refreshHash).toBeNull();

    const active = store.listActive("user_saeed_demo");
    expect(active.map((s) => s.id)).toEqual([
      "sess_laptop_01",
      "sess_tablet_03",
    ]);
  });

  it("revokeAll clears every active session", () => {
    const store = new SessionStore();
    const count = store.revokeAll("user_saeed_demo");
    expect(count).toBe(3);
    expect(store.listActive("user_saeed_demo")).toEqual([]);
    expect(
      store.list("user_saeed_demo").every((s) => s.status === "revoked"),
    ).toBe(true);
  });

  it("returns false when revoking an already revoked session", () => {
    const store = new SessionStore();
    store.revokeOne("user_saeed_demo", "sess_laptop_01");
    expect(store.revokeOne("user_saeed_demo", "sess_laptop_01")).toBe(false);
  });
});

describe("refresh rotation and reuse detection", () => {
  it("rotates a valid refresh token and supersedes the prior hash", () => {
    const store = new SessionStore(createDemoSessions());
    const first = store.rotate("seed_laptop_refresh_v1");
    expect(first.status).toBe("ok");
    if (first.status !== "ok") return;

    const session = store.get("sess_laptop_01");
    expect(session?.refreshHash).toBe(first.issued.hash);
    expect(session?.previousRefreshHash).toBe(
      SessionStore.hash("seed_laptop_refresh_v1"),
    );

    const second = store.rotate(first.issued.rawToken);
    expect(second.status).toBe("ok");
  });

  it("detects reuse of a rotated-out token and kills the family", () => {
    const store = new SessionStore();
    const rotated = store.rotate("seed_laptop_refresh_v1");
    expect(rotated.status).toBe("ok");

    const reuse = store.rotate("seed_laptop_refresh_v1");
    expect(reuse).toEqual({
      status: "rejected",
      reason: "reuse_detected",
    });

    const session = store.get("sess_laptop_01");
    expect(session?.status).toBe("reuse_killed");
    expect(session?.refreshHash).toBeNull();
  });

  it("rejects rotation after revoke", () => {
    const store = new SessionStore();
    store.revokeOne("user_saeed_demo", "sess_phone_02");
    const result = store.rotate("seed_phone_refresh_v1");
    expect(result.status).toBe("rejected");
  });

  it("rejects completely unknown tokens", () => {
    const store = new SessionStore();
    expect(store.rotate("totally_unknown_token")).toEqual({
      status: "rejected",
      reason: "unknown",
    });
  });
});

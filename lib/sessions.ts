import { createHash, randomBytes } from "node:crypto";

/**
 * SessionScope — device sessions with revoke + refresh-token rotation.
 * Refresh secrets are never stored; only SHA-256 hashes.
 */

export type SessionStatus = "active" | "revoked" | "reuse_killed";

export type DeviceSession = {
  id: string;
  userId: string;
  deviceLabel: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  status: SessionStatus;
  /** Current refresh token hash (null when revoked). */
  refreshHash: string | null;
  /** Previous hash after rotation — reuse of this value kills the family. */
  previousRefreshHash: string | null;
  familyId: string;
};

export type IssuedRefresh = {
  sessionId: string;
  /** Raw token shown once to the client; never stored. */
  rawToken: string;
  hash: string;
};

export type RotateResult =
  | { status: "ok"; issued: IssuedRefresh }
  | { status: "rejected"; reason: "revoked" | "unknown" | "reuse_detected" };

function hashToken(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

function mintRawToken(): string {
  return `rt_${randomBytes(24).toString("base64url")}`;
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createDemoSessions(userId = "user_saeed_demo"): DeviceSession[] {
  const familyA = "fam_laptop";
  const familyB = "fam_phone";
  const familyC = "fam_tablet";
  return [
    {
      id: "sess_laptop_01",
      userId,
      deviceLabel: "MacBook Pro — Studio",
      userAgent: "Mozilla/5.0 (Macintosh) Safari/605",
      createdAt: "2026-04-01T08:00:00.000Z",
      lastSeenAt: "2026-04-10T07:40:00.000Z",
      status: "active",
      refreshHash: hashToken("seed_laptop_refresh_v1"),
      previousRefreshHash: null,
      familyId: familyA,
    },
    {
      id: "sess_phone_02",
      userId,
      deviceLabel: "Pixel 8 — Pocket",
      userAgent: "Mozilla/5.0 (Linux; Android 15)",
      createdAt: "2026-04-03T12:00:00.000Z",
      lastSeenAt: "2026-04-10T06:15:00.000Z",
      status: "active",
      refreshHash: hashToken("seed_phone_refresh_v1"),
      previousRefreshHash: null,
      familyId: familyB,
    },
    {
      id: "sess_tablet_03",
      userId,
      deviceLabel: "iPad — Kitchen",
      userAgent: "Mozilla/5.0 (iPad) AppleWebKit/605",
      createdAt: "2026-03-20T18:00:00.000Z",
      lastSeenAt: "2026-04-08T21:00:00.000Z",
      status: "active",
      refreshHash: hashToken("seed_tablet_refresh_v1"),
      previousRefreshHash: null,
      familyId: familyC,
    },
  ];
}

export class SessionStore {
  private sessions: DeviceSession[];

  constructor(seed: DeviceSession[] = createDemoSessions()) {
    this.sessions = seed.map((s) => ({ ...s }));
  }

  list(userId: string): DeviceSession[] {
    return this.sessions
      .filter((s) => s.userId === userId)
      .map((s) => ({ ...s }));
  }

  listActive(userId: string): DeviceSession[] {
    return this.list(userId).filter((s) => s.status === "active");
  }

  get(sessionId: string): DeviceSession | undefined {
    const found = this.sessions.find((s) => s.id === sessionId);
    return found ? { ...found } : undefined;
  }

  /** Revoke a single session. Returns true if it was active and is now revoked. */
  revokeOne(userId: string, sessionId: string): boolean {
    const session = this.sessions.find(
      (s) => s.id === sessionId && s.userId === userId,
    );
    if (!session || session.status !== "active") {
      return false;
    }
    session.status = "revoked";
    session.refreshHash = null;
    session.previousRefreshHash = null;
    session.lastSeenAt = nowIso();
    return true;
  }

  /** Revoke every active session for the user. Returns count revoked. */
  revokeAll(userId: string): number {
    let count = 0;
    for (const session of this.sessions) {
      if (session.userId === userId && session.status === "active") {
        session.status = "revoked";
        session.refreshHash = null;
        session.previousRefreshHash = null;
        session.lastSeenAt = nowIso();
        count += 1;
      }
    }
    return count;
  }

  issueRefresh(sessionId: string): IssuedRefresh | null {
    const session = this.sessions.find((s) => s.id === sessionId);
    if (!session || session.status !== "active") {
      return null;
    }
    const rawToken = mintRawToken();
    const hash = hashToken(rawToken);
    session.refreshHash = hash;
    session.previousRefreshHash = null;
    session.lastSeenAt = nowIso();
    return { sessionId, rawToken, hash };
  }

  /**
   * Rotate: present current raw token → new raw token.
   * Reuse of a previous (rotated-out) hash kills the session family.
   */
  rotate(rawToken: string): RotateResult {
    const presented = hashToken(rawToken);

    for (const session of this.sessions) {
      if (session.previousRefreshHash === presented) {
        this.killFamily(session.userId, session.familyId);
        return { status: "rejected", reason: "reuse_detected" };
      }
    }

    const session = this.sessions.find(
      (s) => s.status === "active" && s.refreshHash === presented,
    );
    if (!session) {
      const wasRevoked = this.sessions.some(
        (s) =>
          s.refreshHash === presented || s.previousRefreshHash === presented,
      );
      return {
        status: "rejected",
        reason: wasRevoked ? "revoked" : "unknown",
      };
    }

    const rawTokenNext = mintRawToken();
    const nextHash = hashToken(rawTokenNext);
    session.previousRefreshHash = session.refreshHash;
    session.refreshHash = nextHash;
    session.lastSeenAt = nowIso();

    return {
      status: "ok",
      issued: {
        sessionId: session.id,
        rawToken: rawTokenNext,
        hash: nextHash,
      },
    };
  }

  private killFamily(userId: string, familyId: string): void {
    for (const session of this.sessions) {
      if (session.userId === userId && session.familyId === familyId) {
        session.status = "reuse_killed";
        session.refreshHash = null;
        session.previousRefreshHash = null;
        session.lastSeenAt = nowIso();
      }
    }
  }

  /** Test helper: hash a known raw seed without going through issue. */
  static hash(raw: string): string {
    return hashToken(raw);
  }
}

"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./panel.module.css";

type SessionStatus = "active" | "revoked" | "reuse_killed";

type DeviceSession = {
  id: string;
  userId: string;
  deviceLabel: string;
  userAgent: string;
  createdAt: string;
  lastSeenAt: string;
  status: SessionStatus;
  refreshHash: string | null;
  previousRefreshHash: string | null;
  familyId: string;
};

type RotateResult =
  | { status: "ok"; issued: { sessionId: string; rawToken: string; hash: string } }
  | { status: "rejected"; reason: "revoked" | "unknown" | "reuse_detected" };

function statusClass(status: SessionStatus): string {
  if (status === "active") return styles.statusActive;
  if (status === "reuse_killed") return styles.statusKilled;
  return styles.statusRevoked;
}

export function SessionPanel() {
  const [sessions, setSessions] = useState<DeviceSession[]>([]);
  const [eventLog, setEventLog] = useState<string[]>([]);
  const [lastRotate, setLastRotate] = useState<RotateResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setError("");
    const res = await fetch("/api/sessions");
    if (!res.ok) {
      setError("Failed to load sessions");
      setLoading(false);
      return;
    }
    const data = (await res.json()) as { sessions: DeviceSession[] };
    setSessions(data.sessions);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function pushLog(line: string) {
    setEventLog((prev) => [line, ...prev].slice(0, 14));
  }

  async function onRevokeOne(id: string) {
    const res = await fetch(`/api/sessions/${id}/revoke`, { method: "POST" });
    const data = (await res.json()) as { ok?: boolean };
    pushLog(
      data.ok
        ? `Revoked session ${id}`
        : `Could not revoke ${id} (already inactive)`,
    );
    await load();
  }

  async function onRevokeAll() {
    const res = await fetch("/api/sessions/revoke-all", { method: "POST" });
    const data = (await res.json()) as { revoked?: number };
    pushLog(`Revoke all: ${data.revoked ?? 0} session(s) cleared`);
    await load();
  }

  async function onRotate(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}/rotate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const result = (await res.json()) as RotateResult & { error?: string };
    setLastRotate(result);
    if (result.status === "ok") {
      pushLog(
        `Rotated ${sessionId} → new hash ${result.issued.hash.slice(0, 12)}…`,
      );
    } else {
      pushLog(
        `Rotate rejected (${"reason" in result ? result.reason : "error"}) for ${sessionId}`,
      );
    }
    await load();
  }

  async function onReuseAttack(sessionId: string) {
    const res = await fetch(`/api/sessions/${sessionId}/replay-old`, {
      method: "POST",
    });
    const result = (await res.json()) as RotateResult;
    setLastRotate(result);
    if (result.status === "rejected" && result.reason === "reuse_detected") {
      pushLog(
        `Reuse of old token on ${sessionId} → family killed (reuse_detected)`,
      );
    } else if (result.status === "ok") {
      pushLog(`First rotate with seed on ${sessionId} (no prior rotation yet)`);
    } else {
      pushLog(`Reuse attempt on ${sessionId}: ${result.reason}`);
    }
    await load();
  }

  if (loading) {
    return (
      <section id="sessions" className={styles.panel}>
        <p className={styles.empty}>Loading sessions…</p>
      </section>
    );
  }

  return (
    <section id="sessions" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Active devices</h2>
        <button type="button" className={styles.danger} onClick={() => void onRevokeAll()}>
          Revoke all
        </button>
      </div>

      {error && <p className={styles.empty}>{error}</p>}

      {sessions.length === 0 ? (
        <p className={styles.empty}>
          No device sessions on this account. Rotate or revoke — hashes persist in{" "}
          <code>data/sessions.json</code>.
        </p>
      ) : null}

      <ul className={styles.list}>
        {sessions.map((s) => (
          <li key={s.id} className={styles.item}>
            <div className={styles.itemMain}>
              <p className={styles.device}>{s.deviceLabel}</p>
              <p className={styles.meta}>
                <span className={statusClass(s.status)}>{s.status}</span>
                <span className={styles.mono}>{s.id}</span>
              </p>
              <p className={styles.ua}>{s.userAgent}</p>
              <p className={styles.seen}>
                Last seen {new Date(s.lastSeenAt).toLocaleString()}
              </p>
              {s.refreshHash && (
                <p className={styles.ua}>
                  hash {s.refreshHash.slice(0, 16)}…
                </p>
              )}
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={styles.btn}
                disabled={s.status !== "active"}
                onClick={() => void onRotate(s.id)}
              >
                Rotate refresh
              </button>
              <button
                type="button"
                className={styles.btnWarn}
                disabled={s.status !== "active"}
                onClick={() => void onReuseAttack(s.id)}
              >
                Replay old token
              </button>
              <button
                type="button"
                className={styles.btnDanger}
                disabled={s.status !== "active"}
                onClick={() => void onRevokeOne(s.id)}
              >
                Revoke
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className={styles.footerGrid}>
        <div>
          <h3 className={styles.sub}>Event log</h3>
          {eventLog.length === 0 ? (
            <p className={styles.empty}>
              Rotate, replay an old token, or revoke to see the chain react.
            </p>
          ) : (
            <ul className={styles.log}>
              {eventLog.map((line, i) => (
                <li key={`${i}-${line.slice(0, 20)}`}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        <div>
          <h3 className={styles.sub}>Last rotate result</h3>
          {lastRotate ? (
            <pre className={styles.pre}>{JSON.stringify(lastRotate, null, 2)}</pre>
          ) : (
            <p className={styles.empty}>No rotation yet.</p>
          )}
        </div>
      </div>
    </section>
  );
}

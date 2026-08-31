# SessionScope

SessionScope is a session-management lab by **Saeed Rumaneh**. It lists devices for a fictional account, supports revoke-one and revoke-all, and models refresh-token rotation with hashed tokens and reuse detection. Session state (hashes only) persists to disk via Next.js route handlers.

## Why it exists

Stolen refresh tokens stay dangerous until they expire — unless rotation invalidates the previous hash and reuse of an old token kills the entire chain. SessionScope shows that flow in a small, testable library and a clear device list UI.

## What it demonstrates

- Device sessions with label, last-seen, and status
- Revoke a single session or wipe all active sessions
- Refresh rotation: store only hashes; issue a new token; mark the old hash as superseded
- Reuse detection: presenting a rotated-out hash revokes the family
- Vitest coverage in `lib/sessions.ts` (`node:crypto` — API routes only, never client)

## Persistence & API

Hashes live in `data/sessions.json` (gitignored). Raw refresh tokens are never written to disk.

| Method | Path | Behavior |
|---|---|---|
| GET | `/api/sessions` | List sessions |
| POST | `/api/sessions/:id/revoke` | Revoke one |
| POST | `/api/sessions/revoke-all` | Revoke all |
| POST | `/api/sessions/:id/rotate` | Body `{ rawToken? }` — rotate (server live token if omitted) |
| POST | `/api/sessions/:id/replay-old` | Replay seed token (reuse demo) |

## Development

Requirements: Node.js 22+ and npm.

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Rotate or revoke, restart — hashes remain in `data/sessions.json`.

```bash
npm test
npm run typecheck
npm run build
```

## Complete product flows

1. Click **Rotate refresh** on a device — a new hash is issued; hashes persist in `data/sessions.json`.
2. Click **Replay old token** — reuse detection kills the family (`reuse_killed`).
3. **Revoke** one session, then **Revoke all** — remaining active sessions are wiped. Restart keeps hashes on disk.

## Security posture

This is a demonstration laboratory, not a production auth server. See [SECURITY.md](SECURITY.md). Demo tokens and devices are fictional.

## License

MIT © 2026 Saeed Rumaneh

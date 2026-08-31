# Security Policy

## Simulator-only design

**SessionScope is an educational session-management lab.** It models device sessions, revoke-one / revoke-all, and refresh-token rotation with hashed tokens and reuse detection. All data is synthetic and held in memory.

Do not use this project to:

- Steal, log, or replay real session or refresh tokens from browsers or APIs
- Attack live authentication endpoints
- Store production credentials in the demo fields

Demo tokens are fictional hashes. Treat any real tokens you paste as compromised and rotate them.

## Reporting a vulnerability

If you discover a security issue in SessionScope itself (for example, flawed reuse detection in `lib/sessions.ts`), email **saeedmr08@gmail.com** with steps to reproduce. Please allow reasonable time for a fix before public disclosure.

## Safe defaults for real apps

When applying lessons from this lab to production:

- Store only hashed refresh tokens; never persist raw refresh secrets
- Rotate refresh tokens on every use and detect reuse of a superseded hash
- Offer revoke-one and revoke-all for the account's active sessions
- Bind sessions to device metadata for user visibility, not as the sole auth factor

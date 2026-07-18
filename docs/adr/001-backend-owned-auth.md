# ADR-001: Backend-owned authentication (not Firebase Auth)

## Status

Accepted (2026-07-18)

## Context

Early VisionCart docs mentioned Firebase authentication. The commerce MVP
explicitly required backend-owned JWT with email/password plus Google and Apple
identity-token verification performed on the API.

## Decision

Keep authentication backend-owned:

- Access/refresh JWTs issued by VisionCart API
- Google ID tokens verified with `google-auth`
- Apple identity tokens verified against Apple JWKS
- No Firebase Auth dependency for the commerce or try-on flows

## Consequences

- Docs that still say "Firebase Auth" are outdated for MVP auth
- Guest identities are first-class API entities rather than Firebase anonymous users
- Social client IDs remain configured via `VISIONCART_GOOGLE_CLIENT_IDS` /
  `VISIONCART_APPLE_CLIENT_IDS`

# Security and privacy plan

Commons will hold verified identities alongside political opinions. Under UK GDPR, political opinion is **special category data**, and a platform for elected officials is an attractive target for hostile states and fraudsters. Security is a core part of the product, not an add-on.

This document lists what the prototype already does and what must happen before real people use it.

## Already in the prototype

- Server-side sessions that can be revoked, referenced by a signed, `HttpOnly`, `SameSite=Lax` cookie (and `Secure` in production)
- Browser-session cookies plus an 8-hour hard limit, so members re-verify each time they come back
- Every write validated with Zod and permission-checked on the server
- Database code marked `server-only`, so it cannot reach the browser
- No identity documents, dates of birth or postcodes stored
- Audit log of sign-ins, posts and moderation actions
- Security headers (`X-Frame-Options`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`)
- The mock identity provider refuses to run in production unless explicitly overridden

## Identity verification

### Target: GOV.UK One Login

GOV.UK One Login is an OpenID Connect provider. Integration plan:

1. Register Commons as a relying party. Access for non-government services is limited, so this needs early conversations with the Government Digital Service. Fallback: a certified provider under the **UK Digital Identity and Attributes Trust Framework (DIATF)**.
2. Implement `GovUkOneLoginProvider` alongside the mock in `src/lib/auth/identity.ts`, using the authorisation code flow with PKCE and `private_key_jwt` client authentication.
3. Request the identity vector of trust `Cl.Cm.P2` (medium-confidence identity check) on first sign-up, and read the signed core identity claim for the verified name.
4. Request the address claim **once** to derive the constituency, then discard the address.
5. Store only the pairwise `sub`, the verified name, the constituency and the assurance level.

### Re-verifying every session

A full identity check on every visit would put people off. The plan:

- **First sign-up:** full identity check (P2).
- **Each visit:** a **passkey** (WebAuthn) bound to the verified account, which uses the device's Face ID, fingerprint or PIN. This proves the same verified person is present.
- **Periodically** (for example every 90 days), or after a suspicious event: a fresh check with the identity provider.
- **Officials and other high-risk accounts:** a passkey on every visit, plus re-verification for sensitive actions such as changing who controls an office account.

### Official accounts

Elected officials' accounts are linked to the **office** as well as the person. They are confirmed against the official register (for example Parliament's Members API and the electoral registers of local authorities). When the office changes hands, control passes to the new holder and the archive is preserved.

## Before launch: checklist

**Infrastructure**
- [ ] PostgreSQL in a UK region, encrypted at rest, with private networking and point-in-time recovery
- [ ] Secrets in a managed secret store; rotate `SESSION_SECRET` and provider keys
- [ ] Web application firewall and rate limiting on sign-in, posting and voting
- [ ] Content Security Policy with nonces

**Application**
- [ ] Passkeys (WebAuthn) for every-session verification
- [ ] Row-level security or a strict data-access layer per role
- [ ] Re-authentication for sensitive actions
- [ ] Session list, so members can see and revoke their devices
- [ ] Abuse detection for coordinated behaviour, even among verified accounts
- [ ] Make the audit log append-only (for example, a separate write-only store)

**Privacy and compliance**
- [ ] Data Protection Impact Assessment (required for special category data at scale)
- [ ] Register with the ICO; appoint a Data Protection Officer
- [ ] Lawful basis and Article 9 condition for processing political opinions
- [ ] Protected Voice: separate the real identity from the public pseudonym, and limit who can link them
- [ ] Retention policy, plus subject access and erasure processes (balanced against officials' permanent record)
- [ ] Assessment under the Online Safety Act 2023

**Assurance**
- [ ] Independent penetration test before launch, then regularly
- [ ] Cyber Essentials Plus as a baseline; consider ISO 27001
- [ ] Responsible disclosure policy and `security.txt`
- [ ] Dependency scanning and signed builds in CI

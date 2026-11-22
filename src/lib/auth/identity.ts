import "server-only";
import { createHash } from "node:crypto";
import { isValidPostcode, lookupConstituency } from "@/lib/constituency";

/**
 * The result of a successful identity check, in a provider-neutral shape.
 *
 * Commons only keeps what it needs: a stable subject identifier, the verified
 * name, the derived constituency and the assurance level. Documents, dates of
 * birth and full addresses stay with the identity provider.
 */
export interface VerifiedIdentity {
  provider: string;
  /** Stable, pairwise identifier for this person at this provider. */
  subject: string;
  name: string;
  constituency: string | null;
  /** GPG 45 identity profile level, e.g. "P2" (medium confidence). */
  assuranceLevel: string;
}

/**
 * Every identity provider implements this interface. The prototype uses
 * MockIdentityProvider. Production will add GovUkOneLoginProvider (OpenID
 * Connect, requesting the identity vector `Cl.Cm.P2`), and potentially
 * certified digital identity services under the UK DIATF.
 */
export interface IdentityProvider {
  readonly id: string;
  readonly displayName: string;
}

export class IdentityVerificationError extends Error {}

/**
 * Simulated identity check for the prototype. It accepts any name and a
 * well-formed UK postcode and derives a deterministic subject from them.
 * It provides NO real assurance and must never be enabled in production.
 */
export const mockIdentityProvider: IdentityProvider & {
  verify(input: { name: string; postcode: string }): VerifiedIdentity;
} = {
  id: "mock",
  displayName: "Simulated GOV.UK One Login",

  verify(input: { name: string; postcode: string }): VerifiedIdentity {
    const name = input.name.trim().replace(/\s+/g, " ");
    if (name.length < 3 || !name.includes(" ")) {
      throw new IdentityVerificationError("Enter your full legal name.");
    }
    if (!isValidPostcode(input.postcode)) {
      throw new IdentityVerificationError("Enter a valid UK postcode.");
    }
    const subject = createHash("sha256")
      .update(`${name.toLowerCase()}|${input.postcode.replace(/\s+/g, "").toUpperCase()}`)
      .digest("hex");
    return {
      provider: "mock",
      subject,
      name,
      constituency: lookupConstituency(input.postcode),
      assuranceLevel: "P2 (simulated)",
    };
  },
};

export function assertMockProviderAllowed() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_MOCK_IDENTITY !== "true") {
    throw new Error("The mock identity provider is disabled in production.");
  }
}

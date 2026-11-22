/**
 * Prototype constituency lookup.
 *
 * Production plan: resolve the verified postcode against the ONS Postcode
 * Directory / MySociety MapIt to get the real Westminster constituency, then
 * discard the postcode. The prototype uses fictional constituencies so that no
 * demo account appears to represent a real place or person.
 */
export const DEMO_CONSTITUENCIES = [
  "Northbridge",
  "Ashcombe and Vale",
  "Kelby East",
  "Westhaven",
  "Harrowfield",
  "Marlstone South",
] as const;

const UK_POSTCODE = /^[A-Z]{1,2}[0-9][A-Z0-9]? ?[0-9][A-Z]{2}$/i;

export function isValidPostcode(postcode: string) {
  return UK_POSTCODE.test(postcode.trim());
}

export function lookupConstituency(postcode: string): string {
  const normalised = postcode.replace(/\s+/g, "").toUpperCase();
  let hash = 0;
  for (const ch of normalised) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return DEMO_CONSTITUENCIES[hash % DEMO_CONSTITUENCIES.length];
}

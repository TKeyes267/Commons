import type { Role } from "@/db/schema";

export const ROLE_LABELS: Record<Role, string> = {
  citizen: "Verified Citizen",
  official: "Elected Official",
  civil_servant: "Civil Servant",
  organisation: "Organisation Representative",
  journalist: "Accredited Journalist",
  academic: "Academic / Expert",
};

export const POSITION_LABELS = { for: "For", against: "Against", undecided: "Undecided" } as const;

export const KIND_LABELS = {
  opening: "Opening statement",
  rebuttal: "Rebuttal",
  evidence: "Evidence",
  closing: "Closing statement",
} as const;

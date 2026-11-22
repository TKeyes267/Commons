import type { ConductConcern } from "@/lib/conduct";

export type FormState =
  | { status: "idle" }
  | { status: "ok"; message?: string }
  | { status: "error"; message: string }
  | { status: "concerns"; concerns: ConductConcern[] };

export const idle: FormState = { status: "idle" };

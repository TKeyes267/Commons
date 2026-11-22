import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * Data-access-layer guard. Every page and server action that needs a
 * verified member calls this; there is no other route to user data.
 */
export const getCurrentMember = cache(async () => getSession());

export async function requireMember() {
  const current = await getCurrentMember();
  if (!current) redirect("/signin");
  return current;
}

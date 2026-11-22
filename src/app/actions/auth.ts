"use server";

import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import {
  IdentityVerificationError,
  assertMockProviderAllowed,
  mockIdentityProvider,
} from "@/lib/auth/identity";
import { createSession, destroySession } from "@/lib/auth/session";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const verifySchema = z.object({
  name: z.string().trim().min(1).max(120),
  postcode: z.string().trim().min(5).max(10),
});

/** Simulated identity check for a new or returning citizen. */
export async function verifyIdentity(_prev: FormState, formData: FormData): Promise<FormState> {
  assertMockProviderAllowed();
  const parsed = verifySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: "Enter your full name and postcode." };

  let identity;
  try {
    identity = mockIdentityProvider.verify(parsed.data);
  } catch (e) {
    if (e instanceof IdentityVerificationError) return { status: "error", message: e.message };
    throw e;
  }

  let user = await db.query.users.findFirst({
    where: and(
      eq(schema.users.identityProvider, identity.provider),
      eq(schema.users.identitySubject, identity.subject),
    ),
  });
  if (!user) {
    [user] = await db
      .insert(schema.users)
      .values({
        identityProvider: identity.provider,
        identitySubject: identity.subject,
        displayName: identity.name,
        constituency: identity.constituency,
        role: "citizen",
      })
      .returning();
    await audit(user.id, "account.created");
  }

  await signIn(user.id, identity.assuranceLevel);
  redirect("/");
}

/** Prototype only: sign in as one of the seeded demo members. */
export async function signInAsDemoMember(formData: FormData) {
  assertMockProviderAllowed();
  const userId = z.string().uuid().parse(formData.get("userId"));
  const user = await db.query.users.findFirst({
    where: and(eq(schema.users.id, userId), eq(schema.users.identityProvider, "demo")),
  });
  if (!user) throw new Error("Unknown demo member.");
  await signIn(user.id, "P2 (simulated)");
  redirect("/");
}

async function signIn(userId: string, assuranceLevel: string) {
  await createSession(userId, assuranceLevel);
  await db
    .update(schema.users)
    .set({ lastVerifiedAt: new Date() })
    .where(eq(schema.users.id, userId));
  await audit(userId, "session.verified", undefined, assuranceLevel);
}

export async function signOut() {
  await destroySession();
  redirect("/signin");
}

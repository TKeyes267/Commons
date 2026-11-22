import "server-only";
import { cookies, headers } from "next/headers";
import { SignJWT, jwtVerify } from "jose";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db, schema } from "@/db";

/**
 * Sessions
 *
 * Commons asks people to verify their identity every time they use the app.
 * We implement that as:
 *   - a browser-session cookie (no Max-Age), so closing the browser ends it;
 *   - a hard maximum lifetime, after which re-verification is required;
 *   - a server-side session row, so any session can be revoked instantly.
 */
const COOKIE_NAME = "commons_session";
export const SESSION_MAX_AGE_MS = 8 * 60 * 60 * 1000; // 8 hours

function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SESSION_SECRET must be set in production.");
    }
    return new TextEncoder().encode("commons-development-only-secret-do-not-use");
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(userId: string, assuranceLevel: string) {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  const userAgent = (await headers()).get("user-agent")?.slice(0, 255) ?? null;

  const [session] = await db
    .insert(schema.sessions)
    .values({ userId, assuranceLevel, verifiedAt: now, expiresAt, userAgent })
    .returning();

  const token = await new SignJWT({ sid: session.id })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresAt)
    .sign(secretKey());

  (await cookies()).set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    // No maxAge/expires: the cookie is discarded when the browser closes.
  });
}

export async function getSession() {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  if (!token) return null;

  let sid: string;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    if (typeof payload.sid !== "string") return null;
    sid = payload.sid;
  } catch {
    return null;
  }

  const row = await db.query.sessions.findFirst({
    where: and(
      eq(schema.sessions.id, sid),
      isNull(schema.sessions.revokedAt),
      gt(schema.sessions.expiresAt, new Date()),
    ),
  });
  if (!row) return null;

  const user = await db.query.users.findFirst({ where: eq(schema.users.id, row.userId) });
  if (!user) return null;

  return { session: row, user };
}

export async function destroySession() {
  const current = await getSession();
  if (current) {
    await db
      .update(schema.sessions)
      .set({ revokedAt: new Date() })
      .where(eq(schema.sessions.id, current.session.id));
  }
  (await cookies()).delete(COOKIE_NAME);
}

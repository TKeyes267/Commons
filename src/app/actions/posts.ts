"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireMember } from "@/lib/auth/dal";
import { reviewConduct } from "@/lib/conduct";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .transform((v) => v || undefined)
  .pipe(z.url({ protocol: /^https?$/ }).optional());

const postSchema = z.object({
  body: z.string().trim().min(1, "Write something first.").max(1000, "Posts are limited to 1,000 characters."),
  citationUrl: optionalUrl,
  topic: z.string().trim().max(40).optional(),
  parentId: z.string().uuid().optional().or(z.literal("").transform(() => undefined)),
  confirm: z.string().optional(),
});

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const data = parsed.data;

  if (!data.confirm) {
    const concerns = reviewConduct(data.body, { hasCitation: !!data.citationUrl });
    if (concerns.length) return { status: "concerns", concerns };
  }

  if (data.parentId) {
    const parent = await db.query.posts.findFirst({ where: eq(schema.posts.id, data.parentId) });
    if (!parent) return { status: "error", message: "The post you are replying to no longer exists." };
  }

  const [post] = await db
    .insert(schema.posts)
    .values({
      authorId: user.id,
      body: data.body,
      citationUrl: data.citationUrl,
      topic: data.topic || null,
      parentId: data.parentId,
    })
    .returning();
  await audit(user.id, data.confirm ? "post.created_after_nudge" : "post.created", {
    type: "post",
    id: post.id,
  });

  revalidatePath("/");
  if (data.parentId) revalidatePath(`/posts/${data.parentId}`);
  return { status: "ok" };
}

export async function toggleFollow(formData: FormData) {
  const { user } = await requireMember();
  const followeeId = z.string().uuid().parse(formData.get("userId"));
  if (followeeId === user.id) return;

  const where = and(
    eq(schema.follows.followerId, user.id),
    eq(schema.follows.followeeId, followeeId),
  );
  const existing = await db.query.follows.findFirst({ where });
  if (existing) await db.delete(schema.follows).where(where);
  else await db.insert(schema.follows).values({ followerId: user.id, followeeId });

  revalidatePath(`/members/${followeeId}`);
  revalidatePath("/");
}

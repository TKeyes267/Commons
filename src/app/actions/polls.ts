"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireMember } from "@/lib/auth/dal";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const pollSchema = z.object({
  question: z.string().trim().min(10, "Write the question in full.").max(200),
  context: z.string().trim().max(1000).optional(),
  options: z
    .array(z.string().trim().max(80))
    .transform((o) => o.filter(Boolean))
    .pipe(z.array(z.string()).min(2, "Give at least two options.").max(6)),
  days: z.coerce.number().int().min(1).max(30),
});

export async function createPoll(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const parsed = pollSchema.safeParse({
    question: formData.get("question"),
    context: formData.get("context") ?? undefined,
    options: formData.getAll("option"),
    days: formData.get("days"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const [poll] = await db
    .insert(schema.polls)
    .values({
      question: parsed.data.question,
      context: parsed.data.context || null,
      authorId: user.id,
      closesAt: new Date(Date.now() + parsed.data.days * 86_400_000),
    })
    .returning();
  await db
    .insert(schema.pollOptions)
    .values(parsed.data.options.map((label, position) => ({ pollId: poll.id, label, position })));
  await audit(user.id, "poll.created", { type: "poll", id: poll.id });

  revalidatePath("/polls");
  return { status: "ok" };
}

export async function votePoll(formData: FormData) {
  const { user } = await requireMember();
  const optionId = z.string().uuid().parse(formData.get("optionId"));
  const option = await db.query.pollOptions.findFirst({ where: eq(schema.pollOptions.id, optionId) });
  if (!option) return;
  const poll = await db.query.polls.findFirst({ where: eq(schema.polls.id, option.pollId) });
  if (!poll || (poll.closesAt && poll.closesAt < new Date())) return;

  await db
    .insert(schema.pollVotes)
    .values({ pollId: poll.id, optionId, userId: user.id })
    .onConflictDoNothing();
  revalidatePath("/polls");
}

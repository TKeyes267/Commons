"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { CONTRIBUTION_KINDS, POSITIONS, SIDES } from "@/db/schema";
import { requireMember } from "@/lib/auth/dal";
import { reviewConduct } from "@/lib/conduct";
import { audit } from "@/lib/audit";
import type { FormState } from "@/lib/form-state";

const uuid = z.string().uuid();

const debateSchema = z.object({
  motion: z.string().trim().min(10, "State the motion in full.").max(200),
  briefing: z.string().trim().min(40, "The briefing should set out the issue and both positions (at least 40 characters).").max(4000),
  days: z.coerce.number().int().min(1).max(30),
});

export async function createDebate(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const parsed = debateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const motion = parsed.data.motion.replace(/^this house believes( that)?\s*/i, "");
  const [debate] = await db
    .insert(schema.debates)
    .values({
      motion: `This House believes ${motion}`,
      briefing: parsed.data.briefing,
      proposerId: user.id,
      chairId: user.id,
      closesAt: new Date(Date.now() + parsed.data.days * 86_400_000),
    })
    .returning();
  await audit(user.id, "debate.created", { type: "debate", id: debate.id });
  redirect(`/debates/${debate.id}`);
}

const contributionSchema = z.object({
  debateId: uuid,
  side: z.enum(SIDES),
  kind: z.enum(CONTRIBUTION_KINDS),
  body: z.string().trim().min(20, "Contributions should be at least 20 characters.").max(2500),
  citationUrl: z
    .string()
    .trim()
    .max(500)
    .transform((v) => v || undefined)
    .pipe(z.url({ protocol: /^https?$/ }).optional()),
  respondsToId: uuid.optional().or(z.literal("").transform(() => undefined)),
  confirm: z.string().optional(),
});

export async function addContribution(_prev: FormState, formData: FormData): Promise<FormState> {
  const { user } = await requireMember();
  const parsed = contributionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };
  const data = parsed.data;

  const debate = await db.query.debates.findFirst({ where: eq(schema.debates.id, data.debateId) });
  if (!debate || debate.status !== "open") return { status: "error", message: "This debate is closed." };

  const initialVote = await db.query.debateVotes.findFirst({
    where: and(
      eq(schema.debateVotes.debateId, debate.id),
      eq(schema.debateVotes.userId, user.id),
      eq(schema.debateVotes.stage, "before"),
    ),
  });
  if (!initialVote) return { status: "error", message: "Record your initial position before contributing." };

  if (data.kind === "rebuttal") {
    if (!data.respondsToId) return { status: "error", message: "Choose the contribution you are rebutting." };
    const target = await db.query.contributions.findFirst({
      where: and(eq(schema.contributions.id, data.respondsToId), eq(schema.contributions.debateId, debate.id)),
    });
    if (!target) return { status: "error", message: "That contribution is not part of this debate." };
    if (target.side === data.side) return { status: "error", message: "A rebuttal must answer the other side." };
  }

  if (!data.confirm) {
    const concerns = reviewConduct(data.body, { hasCitation: !!data.citationUrl });
    if (concerns.length) return { status: "concerns", concerns };
  }

  const [c] = await db
    .insert(schema.contributions)
    .values({
      debateId: debate.id,
      authorId: user.id,
      side: data.side,
      kind: data.kind,
      body: data.body,
      citationUrl: data.citationUrl,
      respondsToId: data.kind === "rebuttal" ? data.respondsToId : null,
    })
    .returning();
  await audit(user.id, "debate.contribution", { type: "contribution", id: c.id });

  revalidatePath(`/debates/${debate.id}`);
  return { status: "ok" };
}

const voteSchema = z.object({
  debateId: uuid,
  stage: z.enum(["before", "after"]),
  position: z.enum(POSITIONS),
});

export async function castDebateVote(formData: FormData) {
  const { user } = await requireMember();
  const data = voteSchema.parse(Object.fromEntries(formData));
  const debate = await db.query.debates.findFirst({ where: eq(schema.debates.id, data.debateId) });
  if (!debate || debate.status !== "open") return;

  const mine = and(eq(schema.debateVotes.debateId, debate.id), eq(schema.debateVotes.userId, user.id));
  if (data.stage === "before") {
    // The initial position is locked once recorded.
    const existing = await db.query.debateVotes.findFirst({
      where: and(mine, eq(schema.debateVotes.stage, "before")),
    });
    if (existing) return;
    await db.insert(schema.debateVotes).values({ ...data, userId: user.id });
  } else {
    const before = await db.query.debateVotes.findFirst({
      where: and(mine, eq(schema.debateVotes.stage, "before")),
    });
    if (!before) return;
    // The final position can change until the debate closes.
    await db
      .insert(schema.debateVotes)
      .values({ ...data, userId: user.id })
      .onConflictDoUpdate({
        target: [schema.debateVotes.debateId, schema.debateVotes.userId, schema.debateVotes.stage],
        set: { position: data.position, createdAt: new Date() },
      });
  }
  revalidatePath(`/debates/${debate.id}`);
}

export async function closeDebate(formData: FormData) {
  const { user } = await requireMember();
  const debateId = uuid.parse(formData.get("debateId"));
  const debate = await db.query.debates.findFirst({ where: eq(schema.debates.id, debateId) });
  if (!debate || debate.chairId !== user.id || debate.status !== "open") return;
  await db
    .update(schema.debates)
    .set({ status: "closed", closedAt: new Date() })
    .where(eq(schema.debates.id, debateId));
  await audit(user.id, "debate.closed", { type: "debate", id: debateId });
  revalidatePath(`/debates/${debateId}`);
  revalidatePath("/debates");
}

export async function callToOrder(formData: FormData) {
  const { user } = await requireMember();
  const contributionId = uuid.parse(formData.get("contributionId"));
  const note = z.string().trim().min(5).max(300).parse(formData.get("note"));
  const c = await db.query.contributions.findFirst({ where: eq(schema.contributions.id, contributionId) });
  if (!c) return;
  const debate = await db.query.debates.findFirst({ where: eq(schema.debates.id, c.debateId) });
  if (!debate || debate.chairId !== user.id) return;
  await db.update(schema.contributions).set({ orderNote: note }).where(eq(schema.contributions.id, c.id));
  await audit(user.id, "debate.called_to_order", { type: "contribution", id: c.id }, note);
  revalidatePath(`/debates/${debate.id}`);
}

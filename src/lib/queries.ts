import "server-only";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import { db, schema } from "@/db";

const { posts, users, follows, debates, contributions, debateVotes, polls, pollOptions, pollVotes } = schema;

const replyCount = sql<number>`(select count(*) from posts r where r.parent_id = ${posts.id})`.mapWith(Number);

export type FeedView = "all" | "following" | "officials";

export async function getFeed(viewerId: string, view: FeedView) {
  const filters = [isNull(posts.parentId)];
  if (view === "following") {
    const followed = db.select({ id: follows.followeeId }).from(follows).where(eq(follows.followerId, viewerId));
    filters.push(or(inArray(posts.authorId, followed), eq(posts.authorId, viewerId))!);
  }
  if (view === "officials") filters.push(eq(users.role, "official"));

  return db
    .select({ post: posts, author: users, replies: replyCount })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(and(...filters))
    .orderBy(desc(posts.createdAt))
    .limit(50);
}

export async function getThread(postId: string) {
  const [root] = await db
    .select({ post: posts, author: users, replies: replyCount })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.id, postId));
  if (!root) return null;
  const replies = await db
    .select({ post: posts, author: users, replies: replyCount })
    .from(posts)
    .innerJoin(users, eq(posts.authorId, users.id))
    .where(eq(posts.parentId, postId))
    .orderBy(posts.createdAt);
  return { root, replies };
}

export async function getDebates() {
  return db
    .select({
      debate: debates,
      proposer: users,
      contributions: sql<number>`(select count(*) from contributions c where c.debate_id = ${debates.id})`.mapWith(Number),
      participants: sql<number>`(select count(*) from debate_votes v where v.debate_id = ${debates.id} and v.stage = 'before')`.mapWith(Number),
    })
    .from(debates)
    .innerJoin(users, eq(debates.proposerId, users.id))
    .orderBy(debates.status, desc(debates.createdAt));
}

export async function getDebate(debateId: string) {
  const debate = await db.query.debates.findFirst({ where: eq(debates.id, debateId) });
  if (!debate) return null;
  const [proposer, chair] = await Promise.all([
    db.query.users.findFirst({ where: eq(users.id, debate.proposerId) }),
    debate.chairId ? db.query.users.findFirst({ where: eq(users.id, debate.chairId) }) : undefined,
  ]);
  const items = await db
    .select({ contribution: contributions, author: users })
    .from(contributions)
    .innerJoin(users, eq(contributions.authorId, users.id))
    .where(eq(contributions.debateId, debateId))
    .orderBy(contributions.createdAt);
  const votes = await db.select().from(debateVotes).where(eq(debateVotes.debateId, debateId));
  return { debate, proposer: proposer!, chair, items, votes };
}

export async function getPolls() {
  const rows = await db
    .select({ poll: polls, author: users })
    .from(polls)
    .innerJoin(users, eq(polls.authorId, users.id))
    .orderBy(desc(polls.createdAt));
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.poll.id);
  const options = await db.select().from(pollOptions).where(inArray(pollOptions.pollId, ids)).orderBy(pollOptions.position);
  const votes = await db
    .select({ pollId: pollVotes.pollId, optionId: pollVotes.optionId, userId: pollVotes.userId, role: users.role })
    .from(pollVotes)
    .innerJoin(users, eq(pollVotes.userId, users.id))
    .where(inArray(pollVotes.pollId, ids));
  return rows.map((r) => ({
    ...r,
    options: options.filter((o) => o.pollId === r.poll.id),
    votes: votes.filter((v) => v.pollId === r.poll.id),
  }));
}

export async function getMember(memberId: string, viewerId: string) {
  const member = await db.query.users.findFirst({ where: eq(users.id, memberId) });
  if (!member) return null;
  const [recentPosts, recentContributions, followers, following] = await Promise.all([
    db
      .select({ post: posts, author: users, replies: replyCount })
      .from(posts)
      .innerJoin(users, eq(posts.authorId, users.id))
      .where(eq(posts.authorId, memberId))
      .orderBy(desc(posts.createdAt))
      .limit(20),
    db
      .select({ contribution: contributions, debate: debates })
      .from(contributions)
      .innerJoin(debates, eq(contributions.debateId, debates.id))
      .where(eq(contributions.authorId, memberId))
      .orderBy(desc(contributions.createdAt))
      .limit(10),
    db.$count(follows, eq(follows.followeeId, memberId)),
    db.query.follows.findFirst({
      where: and(eq(follows.followerId, viewerId), eq(follows.followeeId, memberId)),
    }),
  ]);
  return { member, recentPosts, recentContributions, followers, isFollowing: !!following };
}

export async function getDemoMembers() {
  return db.query.users.findMany({ where: eq(users.identityProvider, "demo") });
}

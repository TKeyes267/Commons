/**
 * Commons data model.
 *
 * Written for SQLite in the prototype, but kept deliberately portable to
 * PostgreSQL: text UUID primary keys, timestamps stored as dates, enums as
 * constrained text. See docs/architecture.md for the migration plan.
 */
import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
  type AnySQLiteColumn,
} from "drizzle-orm/sqlite-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`);

export const ROLES = [
  "citizen",
  "official",
  "civil_servant",
  "organisation",
  "journalist",
  "academic",
] as const;
export type Role = (typeof ROLES)[number];

export const SIDES = ["for", "against"] as const;
export type Side = (typeof SIDES)[number];

export const CONTRIBUTION_KINDS = ["opening", "rebuttal", "evidence", "closing"] as const;
export type ContributionKind = (typeof CONTRIBUTION_KINDS)[number];

export const POSITIONS = ["for", "against", "undecided"] as const;
export type Position = (typeof POSITIONS)[number];

/* ------------------------------------------------------------------ */
/* Identity and sessions                                               */
/* ------------------------------------------------------------------ */

export const users = sqliteTable(
  "users",
  {
    id: id(),
    /**
     * Stable, pairwise subject identifier from the identity provider
     * (e.g. GOV.UK One Login `sub`). We never store identity documents,
     * dates of birth or full postcodes.
     */
    identityProvider: text("identity_provider").notNull(),
    identitySubject: text("identity_subject").notNull(),
    displayName: text("display_name").notNull(),
    role: text("role", { enum: ROLES }).notNull().default("citizen"),
    /** Constituency derived from a verified address. The postcode itself is discarded. */
    constituency: text("constituency"),
    /** For officials: the office held, e.g. "Member of Parliament for Northbridge". */
    office: text("office"),
    /** For organisation representatives, civil servants, journalists, academics. */
    organisation: text("organisation"),
    /** Declared interests, shown on every post by this user. */
    declaredInterests: text("declared_interests"),
    bio: text("bio"),
    /** True for Protected Voice accounts: verified, but shown pseudonymously. */
    protectedVoice: integer("protected_voice", { mode: "boolean" }).notNull().default(false),
    lastVerifiedAt: integer("last_verified_at", { mode: "timestamp" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_identity_idx").on(t.identityProvider, t.identitySubject)],
);

/**
 * Server-side session records. The browser cookie holds a signed token that
 * references one of these rows, so any session can be revoked immediately.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Identity assurance level reported by the provider (e.g. GPG 45 "P2"). */
    assuranceLevel: text("assurance_level").notNull(),
    verifiedAt: integer("verified_at", { mode: "timestamp" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
    revokedAt: integer("revoked_at", { mode: "timestamp" }),
    userAgent: text("user_agent"),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

/** Append-only log of security-relevant and record-keeping events. */
export const auditEvents = sqliteTable(
  "audit_events",
  {
    id: id(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    subjectType: text("subject_type"),
    subjectId: text("subject_id"),
    detail: text("detail"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_user_idx").on(t.userId)],
);

/* ------------------------------------------------------------------ */
/* Feed                                                                */
/* ------------------------------------------------------------------ */

export const posts = sqliteTable(
  "posts",
  {
    id: id(),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    parentId: text("parent_id").references((): AnySQLiteColumn => posts.id),
    body: text("body").notNull(),
    citationUrl: text("citation_url"),
    citationTitle: text("citation_title"),
    topic: text("topic"),
    createdAt: createdAt(),
  },
  (t) => [index("posts_parent_idx").on(t.parentId), index("posts_author_idx").on(t.authorId)],
);

export const follows = sqliteTable(
  "follows",
  {
    followerId: text("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followeeId: text("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("follows_pair_idx").on(t.followerId, t.followeeId)],
);

/* ------------------------------------------------------------------ */
/* Debates                                                             */
/* ------------------------------------------------------------------ */

export const debates = sqliteTable("debates", {
  id: id(),
  /** "This House believes…" */
  motion: text("motion").notNull(),
  /** Neutral briefing: the issue, the main positions and key facts. */
  briefing: text("briefing").notNull(),
  proposerId: text("proposer_id")
    .notNull()
    .references(() => users.id),
  chairId: text("chair_id").references(() => users.id),
  status: text("status", { enum: ["open", "closed"] }).notNull().default("open"),
  closesAt: integer("closes_at", { mode: "timestamp" }),
  closedAt: integer("closed_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const contributions = sqliteTable(
  "contributions",
  {
    id: id(),
    debateId: text("debate_id")
      .notNull()
      .references(() => debates.id, { onDelete: "cascade" }),
    authorId: text("author_id")
      .notNull()
      .references(() => users.id),
    side: text("side", { enum: SIDES }).notNull(),
    kind: text("kind", { enum: CONTRIBUTION_KINDS }).notNull(),
    /** For rebuttals: the contribution being answered. */
    respondsToId: text("responds_to_id").references((): AnySQLiteColumn => contributions.id),
    body: text("body").notNull(),
    citationUrl: text("citation_url"),
    /** Set by the chair when a contribution breaches the code of conduct. */
    orderNote: text("order_note"),
    createdAt: createdAt(),
  },
  (t) => [index("contributions_debate_idx").on(t.debateId)],
);

/** Each member records a position before and after the debate. */
export const debateVotes = sqliteTable(
  "debate_votes",
  {
    debateId: text("debate_id")
      .notNull()
      .references(() => debates.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    stage: text("stage", { enum: ["before", "after"] }).notNull(),
    position: text("position", { enum: POSITIONS }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("debate_votes_unique_idx").on(t.debateId, t.userId, t.stage)],
);

/* ------------------------------------------------------------------ */
/* Polls                                                               */
/* ------------------------------------------------------------------ */

export const polls = sqliteTable("polls", {
  id: id(),
  question: text("question").notNull(),
  context: text("context"),
  authorId: text("author_id")
    .notNull()
    .references(() => users.id),
  closesAt: integer("closes_at", { mode: "timestamp" }),
  createdAt: createdAt(),
});

export const pollOptions = sqliteTable("poll_options", {
  id: id(),
  pollId: text("poll_id")
    .notNull()
    .references(() => polls.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  position: integer("position").notNull(),
});

export const pollVotes = sqliteTable(
  "poll_votes",
  {
    pollId: text("poll_id")
      .notNull()
      .references(() => polls.id, { onDelete: "cascade" }),
    optionId: text("option_id")
      .notNull()
      .references(() => pollOptions.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("poll_votes_unique_idx").on(t.pollId, t.userId)],
);

export type User = typeof users.$inferSelect;
export type Post = typeof posts.$inferSelect;
export type Debate = typeof debates.$inferSelect;
export type Contribution = typeof contributions.$inferSelect;
export type Poll = typeof polls.$inferSelect;

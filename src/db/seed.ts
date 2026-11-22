/**
 * Seeds the prototype with fictional demo members and content.
 * All people, offices and constituencies here are invented.
 */
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

const db = drizzle(createClient({ url: process.env.DATABASE_URL ?? "file:./data/commons.db" }), { schema });

const ago = (hours: number) => new Date(Date.now() - hours * 3_600_000);
const ahead = (days: number) => new Date(Date.now() + days * 86_400_000);

type NewUser = typeof schema.users.$inferInsert;
const people: Record<string, Omit<NewUser, "identityProvider" | "identitySubject">> = {
  marsh: {
    displayName: "Eleanor Marsh MP",
    role: "official",
    office: "Member of Parliament for Northbridge",
    constituency: "Northbridge",
    bio: "Member for Northbridge since 2019. Sits on the Housing, Communities and Local Government Committee.",
  },
  okafor: {
    displayName: "Cllr Daniel Okafor",
    role: "official",
    office: "Councillor, Westhaven Borough Council (Cabinet Member for Housing)",
    constituency: "Westhaven",
  },
  raman: {
    displayName: "Priya Raman",
    role: "civil_servant",
    organisation: "Office for Regional Growth (policy adviser)",
    constituency: "Harrowfield",
    bio: "Writing in a personal capacity about published policy. Views are not those of the department.",
  },
  whitfield: {
    displayName: "James Whitfield",
    role: "organisation",
    organisation: "Northern Housebuilders' Federation",
    declaredInterests: "Director of Policy. The Federation is funded by its member housebuilding companies.",
    constituency: "Kelby East",
  },
  fenwick: {
    displayName: "Dr Amara Fenwick",
    role: "academic",
    organisation: "Harrowfield University, Centre for Housing Economics",
    constituency: "Harrowfield",
  },
  ellis: {
    displayName: "Sam Ellis",
    role: "journalist",
    organisation: "The Westhaven Courier",
    constituency: "Westhaven",
  },
  holloway: { displayName: "Margaret Holloway", role: "citizen", constituency: "Kelby East", bio: "Retired teacher. School governor." },
  byrne: { displayName: "Callum Byrne", role: "citizen", constituency: "Ashcombe and Vale", bio: "Apprentice electrician, 19." },
  adeyemi: { displayName: "Grace Adeyemi", role: "citizen", constituency: "Northbridge" },
  protected: {
    displayName: "Protected Voice",
    role: "citizen",
    constituency: "Marlstone South",
    protectedVoice: true,
  },
};

async function main() {
  const ids: Record<string, string> = {};
  for (const [key, p] of Object.entries(people)) {
    const [u] = await db
      .insert(schema.users)
      .values({ ...p, identityProvider: "demo", identitySubject: `demo-${key}` })
      .returning();
    ids[key] = u.id;
  }

  /* ---------------- Feed ---------------- */
  const post = async (author: string, body: string, hoursAgo: number, extra: Partial<typeof schema.posts.$inferInsert> = {}) => {
    const [p] = await db
      .insert(schema.posts)
      .values({ authorId: ids[author], body, createdAt: ago(hoursAgo), ...extra })
      .returning();
    return p.id;
  };

  const p1 = await post(
    "marsh",
    "I will be holding a Question Time session for Northbridge constituents next Thursday. The main topic is the proposed bypass. Please submit questions in advance. I will answer the most supported ones on the record.",
    30,
    { topic: "Northbridge" },
  );
  await post("adeyemi", "Thank you. Will the session cover the consultation timetable? Many residents only heard about it last week.", 29, { parentId: p1 });
  await post("marsh", "Yes. I will set out the timetable and press the county council to extend it by four weeks.", 28, { parentId: p1 });

  const p2 = await post(
    "fenwick",
    "New analysis: the median house price in the region is now 8.3 times median earnings. Our briefing sets out what that means for first-time buyers and what levers councils actually have.",
    20,
    { topic: "Housing", citationUrl: "https://example.org/briefings/housing-affordability" },
  );
  await post("whitfield", "A useful briefing. We would add that planning delays account for a large share of the gap between permissions and completions. Happy to share our members' data.", 19, { parentId: p2 });
  await post("ellis", "Would you be willing to give evidence on that in the housing debate? It would help to have the data in the open.", 18, { parentId: p2 });

  await post(
    "raman",
    "For anyone following the regional growth fund: the published guidance (linked) sets out how bids are scored. Questions on the process are welcome; I cannot comment on individual bids.",
    12,
    { topic: "Regional growth", citationUrl: "https://example.org/guidance/regional-growth-fund" },
  );
  await post(
    "byrne",
    "I'm 19 and most people my age I know don't follow politics on social media because it's just people shouting. This is the first place I've seen an MP actually answer a question.",
    6,
  );
  await post(
    "protected",
    "As a care worker, I can't speak publicly under my own name. Staffing on night shifts in our area has been below safe levels for months. I hope the health debate considers this.",
    3,
    { topic: "Health" },
  );

  /* ---------------- Debates ---------------- */
  const [votingAge] = await db
    .insert(schema.debates)
    .values({
      motion: "This House believes that 16- and 17-year-olds should be able to vote in general elections",
      briefing:
        "16- and 17-year-olds can already vote in Scottish Parliament and Senedd elections. Supporters argue that people of that age pay taxes, can work, and that voting early builds lifelong participation. Opponents argue that most legal rights of adulthood begin at 18, and that the age of majority should be consistent. Turnout among newly enfranchised young voters in Scotland was higher than among 18–24-year-olds in some studies, though evidence on long-term effects is still emerging.",
      proposerId: ids.ellis,
      chairId: ids.ellis,
      closesAt: ahead(5),
      createdAt: ago(48),
    })
    .returning();

  const contribute = async (
    debateId: string,
    author: string,
    side: schema.Side,
    kind: schema.ContributionKind,
    body: string,
    hoursAgo: number,
    extra: Partial<typeof schema.contributions.$inferInsert> = {},
  ) => {
    const [c] = await db
      .insert(schema.contributions)
      .values({ debateId, authorId: ids[author], side, kind, body, createdAt: ago(hoursAgo), ...extra })
      .returning();
    return c.id;
  };

  await contribute(votingAge.id, "byrne", "for", "opening",
    "I started work at 16 and paid income tax and National Insurance from my first pay packet. Decisions about tax, apprenticeships and housing affect my generation for longer than anyone else's. If we are old enough to contribute, we are old enough to have a say in how that contribution is spent.", 40);
  const against1 = await contribute(votingAge.id, "holloway", "against", "opening",
    "I taught sixteen-year-olds for thirty years and have great respect for them. But we set 18 as the age of adulthood for good reasons: it is when people can sign contracts, serve on juries and stand for Parliament. The voting age should stay aligned with the other responsibilities of adulthood, rather than moving on its own.", 38);
  await contribute(votingAge.id, "fenwick", "for", "evidence",
    "Research following the 2014 Scottish independence referendum found that 16- and 17-year-olds who voted were more likely to vote again in later elections than those first eligible at 18–20. The evidence base is still developing, but it suggests earlier enfranchisement can build the habit of voting.", 30,
    { citationUrl: "https://example.org/research/votes-at-16-scotland" });
  await contribute(votingAge.id, "byrne", "for", "rebuttal",
    "Those thresholds are not consistent today: you can join the armed forces, marry with consent in some parts of the UK, and vote in Scotland and Wales before 18. The question is which responsibilities are most relevant to voting, and paying tax is one of them.", 22,
    { respondsToId: against1 });

  const votes: [string, schema.Position, schema.Position | null][] = [
    ["byrne", "for", "for"],
    ["holloway", "against", "against"],
    ["fenwick", "undecided", "for"],
    ["adeyemi", "against", "undecided"],
    ["marsh", "undecided", "for"],
    ["okafor", "for", null],
    ["whitfield", "against", "against"],
  ];
  for (const [who, before, after] of votes) {
    await db.insert(schema.debateVotes).values({ debateId: votingAge.id, userId: ids[who], stage: "before", position: before });
    if (after) await db.insert(schema.debateVotes).values({ debateId: votingAge.id, userId: ids[who], stage: "after", position: after });
  }

  const [housing] = await db
    .insert(schema.debates)
    .values({
      motion: "This House believes that national housing targets should take precedence over local planning objections",
      briefing:
        "Local authorities set out where homes can be built in their local plans, and residents can object to individual applications. The government sets national targets for new homes. Supporters of the motion argue that local objections delay much-needed housing and push prices up. Opponents argue that local communities understand infrastructure pressures (schools, GP surgeries, roads) and that overriding them erodes trust in planning.",
      proposerId: ids.okafor,
      chairId: ids.okafor,
      closesAt: ahead(10),
      createdAt: ago(10),
    })
    .returning();
  await contribute(housing.id, "whitfield", "for", "opening",
    "Our members hold planning permissions for thousands of homes that are stuck in appeals and conditions. Every year of delay adds to costs that are passed on to buyers. Clear national targets give certainty to councils and builders alike.", 8);
  await contribute(housing.id, "marsh", "against", "opening",
    "Northbridge has accepted significant growth, but the surgery and primary school were never expanded to match. When residents object, it is often about infrastructure, not about homes. Overriding them without funding infrastructure will make the next development harder, not easier.", 6);
  for (const [who, pos] of [["whitfield", "for"], ["marsh", "against"], ["okafor", "undecided"], ["holloway", "against"]] as const) {
    await db.insert(schema.debateVotes).values({ debateId: housing.id, userId: ids[who], stage: "before", position: pos });
  }

  const [closed] = await db
    .insert(schema.debates)
    .values({
      motion: "This House believes that MPs should publish a summary of every meeting with a lobbyist",
      briefing:
        "Ministers publish quarterly lists of external meetings, but backbench MPs do not have to. Supporters argue for full transparency; opponents argue the burden would fall on small charities and constituents as much as on professional lobbyists.",
      proposerId: ids.adeyemi,
      chairId: ids.adeyemi,
      status: "closed",
      closesAt: ago(24),
      closedAt: ago(24),
      createdAt: ago(24 * 9),
    })
    .returning();
  await contribute(closed.id, "adeyemi", "for", "opening",
    "If a meeting can influence a vote, constituents deserve to know it happened. A one-line summary is a small price for public trust.", 24 * 8);
  await contribute(closed.id, "okafor", "against", "opening",
    "Many of the meetings I hold are with residents' associations and small charities. A blanket rule should distinguish paid lobbying from constituents seeking help.", 24 * 7);
  for (const [who, b, a] of [["adeyemi", "for", "for"], ["okafor", "against", "for"], ["holloway", "undecided", "for"], ["whitfield", "against", "against"], ["byrne", "for", "for"]] as const) {
    await db.insert(schema.debateVotes).values({ debateId: closed.id, userId: ids[who], stage: "before", position: b });
    await db.insert(schema.debateVotes).values({ debateId: closed.id, userId: ids[who], stage: "after", position: a });
  }

  /* ---------------- Polls ---------------- */
  const poll = async (author: string, question: string, context: string | null, options: string[], votes: Record<string, number>) => {
    const [p] = await db.insert(schema.polls).values({ question, context, authorId: ids[author], closesAt: ahead(7) }).returning();
    const opts = await db
      .insert(schema.pollOptions)
      .values(options.map((label, position) => ({ pollId: p.id, label, position })))
      .returning();
    for (const [who, idx] of Object.entries(votes)) {
      await db.insert(schema.pollVotes).values({ pollId: p.id, optionId: opts[idx].id, userId: ids[who] });
    }
  };
  await poll("marsh", "Should the Northbridge bypass consultation be extended by four weeks?",
    "The county council's consultation currently closes on the 30th.",
    ["Yes, extend it", "No, keep the current deadline", "No view"],
    { adeyemi: 0, holloway: 0, byrne: 2, okafor: 1 });
  await poll("ellis", "Which issue should the next Commons debate cover?", null,
    ["NHS waiting lists", "Energy bills", "Local bus services", "Social care funding"],
    { holloway: 3, byrne: 2, fenwick: 0, raman: 2, protected: 3, adeyemi: 0 });

  console.log(`Seeded ${Object.keys(ids).length} demo members, 3 debates, 2 polls.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

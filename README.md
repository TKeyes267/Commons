# Commons

**Grown-up social media for digital democracies.**

Commons is a social platform for political debate and policy formation. It is a place where verified citizens, elected officials, civil servants, business leaders and experts discuss public questions to a high standard *before* the formal political process takes over.

Think of it as an online parliamentary chamber: as open and immediate as a social feed, with the structure, conduct and record-keeping of a debating chamber.

## Principles

1. **Every participant is a verified, real person.** Identity is confirmed at sign-up and re-checked each session.
2. **Conduct matters.** The platform encourages formal, good-faith debate and does not reward outrage.
3. **Structure over noise.** Formal debates, motions, questions and polls sit alongside the everyday feed.
4. **Fewer barriers.** Officials, civil servants, business and the electorate share one space, on equal procedural terms.
5. **Discussion leads somewhere.** Debates, polls and drafts feed into consultations, petitions and the real legislative process.
6. **Transparency by default.** Interests are declared, officials' posts are permanent, and the record is public.

## Documentation

- [Vision](docs/vision.md): the problem, the idea, and who it is for
- [Features](docs/features.md): the product concept in detail
- [Roadmap](docs/roadmap.md): the order of build, starting with the MVP
- [Open questions](docs/open-questions.md): decisions still to make
- [Architecture](docs/architecture.md): how the code is organised, and the path to PostgreSQL
- [Security and privacy](docs/security.md): identity verification and the pre-launch checklist

## Status

**Working prototype** for a UK launch, web first. Identity checks are simulated and all demo members are fictional.

The prototype includes:

- Identity verification on every visit (simulated GOV.UK One Login), with sessions that end when the browser closes or after 8 hours
- Verified roles on every post: citizen, elected official, civil servant, organisation (with declared interests), journalist, academic, and Protected Voice
- **The Chamber:** a feed with posts, replies, sources, follows, and filters for following and elected officials
- **Pause before posting:** flags personal attacks, shouting and unsourced figures, and asks whether you'd like to revise
- **Formal debates:** a motion and a neutral briefing; For and Against sides; opening statements, rebuttals, evidence and closing statements; a locked initial vote and a final vote, showing how many minds changed; a chair who can call contributions to order and close the debate
- **Polls:** results shown after you vote, with a breakdown by verified role

## Running it locally

You need Node.js 20 or later.

```bash
npm install
npm run setup   # creates and seeds the local database
npm run dev
```

Then open http://localhost:3000 and sign in as a demo member, or verify as a new citizen with any full name and UK postcode.

`npm run db:reset` wipes the local database and restores the demo data.

Before deploying to production, read [docs/security.md](docs/security.md). The mock identity provider refuses to run in production.

# Roadmap

Commons should launch in **one country first**, because identity schemes and parliamentary customs differ by jurisdiction.

## Phase 0: Foundations ✅
- [x] Launch country: **United Kingdom**; identity via GOV.UK One Login (or a DIATF-certified provider)
- [x] Tech stack and architecture (see [architecture.md](architecture.md))
- [x] Code of conduct (first draft, in the app)
- [x] Data model (users, roles, sessions, posts, debates, polls, audit log)

## Phase 1: Prototype (web) ✅
- [x] Simulated identity verification, repeated on every visit
- [x] Profiles with verified roles, declared interests and Protected Voice
- [x] Chamber feed: posts, replies, follows, sources
- [x] "Pause before posting" conduct check
- [x] Formal debates: motion, briefing, For/Against, rebuttals, before-and-after votes, chair
- [x] Polls with results by role

## Phase 1b: Production foundations
- [ ] PostgreSQL and reviewed migrations
- [ ] GOV.UK One Login integration
- [ ] Passkeys for re-verification on every visit
- [ ] Reporting and moderation queue
- [ ] Automated tests and CI
- [ ] Items on the [security checklist](security.md#before-launch-checklist)

## Phase 2: Engagement with officials
- Official accounts tied to offices
- Constituency verification and local chambers
- Question Time
- Petitions with response thresholds

## Phase 3: Deliberation tools
- Argument maps
- Deliberative polling and consensus finding
- AI neutral briefings and the "pause before posting" check
- Standing score

## Phase 4: Policy pipeline
- Collaborative policy drafting with amendments
- Committee-style hearings
- Export to consultations
- Statements vs. voting record

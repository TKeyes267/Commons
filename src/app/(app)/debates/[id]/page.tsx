import Link from "next/link";
import { notFound } from "next/navigation";
import type { Contribution, Position, User } from "@/db/schema";
import { requireMember } from "@/lib/auth/dal";
import { getDebate } from "@/lib/queries";
import { addContribution, callToOrder, castDebateVote, closeDebate } from "@/app/actions/debates";
import { ActionForm } from "@/components/ActionForm";
import { MemberName } from "@/components/MemberName";
import { Citation } from "@/components/Citation";
import { KIND_LABELS, POSITION_LABELS } from "@/lib/roles";
import { formatDate, timeAgo, timeUntil } from "@/lib/format";
import { isUuid } from "@/lib/ids";

const POSITIONS: Position[] = ["for", "against", "undecided"];

type Item = { contribution: Contribution; author: User };

export default async function DebatePage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getDebate(id);
  if (!data) notFound();
  const { debate, proposer, chair, items, votes } = data;

  const isOpen = debate.status === "open";
  const isChair = chair?.id === user.id;
  const myBefore = votes.find((v) => v.userId === user.id && v.stage === "before")?.position;
  const myAfter = votes.find((v) => v.userId === user.id && v.stage === "after")?.position;
  const canSeeResults = !!myBefore || !isOpen;

  const tally = (stage: "before" | "after") => {
    const stageVotes = votes.filter((v) => v.stage === stage);
    const counts = Object.fromEntries(POSITIONS.map((p) => [p, stageVotes.filter((v) => v.position === p).length]));
    return { counts: counts as Record<Position, number>, total: stageVotes.length };
  };
  const before = tally("before");
  const after = tally("after");
  const changedMinds = votes.filter((v) => {
    if (v.stage !== "after") return false;
    const b = votes.find((x) => x.userId === v.userId && x.stage === "before");
    return b && b.position !== v.position;
  }).length;

  const byId = new Map(items.map((i) => [i.contribution.id, i]));
  const side = (s: "for" | "against") => items.filter((i) => i.contribution.side === s);

  return (
    <div>
      <p className="breadcrumb">
        <Link href="/debates">← Debates</Link>
      </p>

      <header className="debate-head card">
        <div className="row-between">
          <span className={`status status-${debate.status}`}>{isOpen ? "Open" : "Closed"}</span>
          <span className="muted small">
            {isOpen && debate.closesAt ? `Closes ${timeUntil(debate.closesAt)}` : null}
            {!isOpen && debate.closedAt ? `Closed ${formatDate(debate.closedAt)}` : null}
          </span>
        </div>
        <h1 className="motion">{debate.motion}</h1>
        <p className="muted small">
          Proposed by <Link href={`/members/${proposer.id}`}>{proposer.displayName}</Link>
          {chair && (
            <>
              {" "}· In the chair: <Link href={`/members/${chair.id}`}>{chair.displayName}</Link>
            </>
          )}
        </p>
        <section className="briefing">
          <h2>Briefing</h2>
          <p>{debate.briefing}</p>
        </section>
        {isChair && isOpen && (
          <form action={closeDebate} className="chair-tools">
            <input type="hidden" name="debateId" value={debate.id} />
            <span className="muted small">You are in the chair.</span>
            <button className="button-secondary button-small">Close the debate</button>
          </form>
        )}
      </header>

      <section className="card vote-panel">
        {!myBefore && isOpen && (
          <>
            <h2>Record your initial position</h2>
            <p className="muted">
              Before reading the arguments, where do you stand? This is locked once recorded, so we can measure how
              the debate changes minds. Results are shown after you vote.
            </p>
            <VoteButtons debateId={debate.id} stage="before" current={undefined} />
          </>
        )}
        {myBefore && isOpen && (
          <>
            <h2>Your position</h2>
            <p className="muted">
              Initially: <strong>{POSITION_LABELS[myBefore]}</strong>.{" "}
              {myAfter ? "Your final position (you can change it until the debate closes):" : "Having heard the arguments, where do you stand now?"}
            </p>
            <VoteButtons debateId={debate.id} stage="after" current={myAfter} />
          </>
        )}
        {canSeeResults && (
          <div className="results">
            <ResultBar label="Before the debate" counts={before.counts} total={before.total} />
            <ResultBar label={isOpen ? "Now" : "After the debate"} counts={after.counts} total={after.total} />
            <p className="muted small">
              {changedMinds} {changedMinds === 1 ? "member has" : "members have"} changed position.{" "}
              {after.total < before.total && isOpen && `${before.total - after.total} yet to record a final position.`}
            </p>
          </div>
        )}
        {!isOpen && !canSeeResults && <p className="muted">This debate is closed.</p>}
      </section>

      <div className="sides">
        {(["for", "against"] as const).map((s) => (
          <section key={s} className={`side side-${s}`}>
            <h2>{s === "for" ? "For the motion" : "Against the motion"}</h2>
            {side(s).length === 0 && <p className="muted">No contributions yet.</p>}
            {side(s).map((item) => (
              <ContributionCard
                key={item.contribution.id}
                item={item}
                respondsTo={item.contribution.respondsToId ? byId.get(item.contribution.respondsToId) : undefined}
                isChair={isChair && isOpen}
              />
            ))}
          </section>
        ))}
      </div>

      {isOpen && myBefore && (
        <section className="card">
          <h2>Make a contribution</h2>
          <ActionForm action={addContribution} submitLabel="Contribute">
            <input type="hidden" name="debateId" value={debate.id} />
            <div className="row">
              <label>
                <span className="label">Side</span>
                <select name="side" defaultValue={myBefore === "against" ? "against" : "for"}>
                  <option value="for">For the motion</option>
                  <option value="against">Against the motion</option>
                </select>
              </label>
              <label>
                <span className="label">Type</span>
                <select name="kind" defaultValue="opening">
                  {Object.entries(KIND_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              <span className="label">Responding to</span>
              <span className="hint">Required for rebuttals. A rebuttal must answer a contribution from the other side.</span>
              <select name="respondsToId" defaultValue="">
                <option value="">Not a rebuttal</option>
                {items.map(({ contribution: c, author }) => (
                  <option key={c.id} value={c.id}>
                    [{c.side === "for" ? "For" : "Against"}] {author.displayName}: {c.body.slice(0, 60)}…
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="label">Your contribution</span>
              <textarea name="body" rows={6} required minLength={20} maxLength={2500} />
            </label>
            <input name="citationUrl" type="url" placeholder="Source link (optional)" aria-label="Source link" />
          </ActionForm>
        </section>
      )}
    </div>
  );
}

function VoteButtons({
  debateId,
  stage,
  current,
}: {
  debateId: string;
  stage: "before" | "after";
  current: Position | undefined;
}) {
  return (
    <form action={castDebateVote} className="vote-buttons">
      <input type="hidden" name="debateId" value={debateId} />
      <input type="hidden" name="stage" value={stage} />
      {POSITIONS.map((p) => (
        <button
          key={p}
          name="position"
          value={p}
          className={`vote vote-${p}${current === p ? " selected" : ""}`}
          aria-pressed={current === p}
        >
          {POSITION_LABELS[p]}
        </button>
      ))}
    </form>
  );
}

function ResultBar({ label, counts, total }: { label: string; counts: Record<Position, number>; total: number }) {
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return (
    <div className="result">
      <div className="row-between small">
        <strong>{label}</strong>
        <span className="muted">{total} votes</span>
      </div>
      <div className="bar" role="img" aria-label={`For ${pct(counts.for)}%, Against ${pct(counts.against)}%, Undecided ${pct(counts.undecided)}%`}>
        {POSITIONS.map((p) =>
          counts[p] > 0 ? (
            <span key={p} className={`bar-${p}`} style={{ width: `${pct(counts[p])}%` }}>
              {pct(counts[p]) >= 12 ? `${POSITION_LABELS[p]} ${pct(counts[p])}%` : ""}
            </span>
          ) : null,
        )}
        {total === 0 && <span className="bar-empty">No votes yet</span>}
      </div>
    </div>
  );
}

function ContributionCard({ item, respondsTo, isChair }: { item: Item; respondsTo?: Item; isChair: boolean }) {
  const { contribution: c, author } = item;
  return (
    <article className="card contribution" id={`c-${c.id}`}>
      <div className="row-between">
        <span className={`kind kind-${c.kind}`}>{KIND_LABELS[c.kind]}</span>
        <time className="muted small" dateTime={c.createdAt.toISOString()}>
          {timeAgo(c.createdAt)}
        </time>
      </div>
      <MemberName user={author} />
      {respondsTo && (
        <a href={`#c-${respondsTo.contribution.id}`} className="responds-to">
          ↳ Responds to {respondsTo.author.displayName}&rsquo;s {KIND_LABELS[respondsTo.contribution.kind].toLowerCase()}
        </a>
      )}
      <p className="body">{c.body}</p>
      {c.citationUrl && <Citation url={c.citationUrl} />}
      {c.orderNote && (
        <p className="order-note">
          <strong>Called to order by the chair:</strong> {c.orderNote}
        </p>
      )}
      {isChair && !c.orderNote && (
        <details className="chair-action">
          <summary>Call to order</summary>
          <form action={callToOrder} className="stack">
            <input type="hidden" name="contributionId" value={c.id} />
            <input name="note" required minLength={5} maxLength={300} placeholder="Reason, with reference to the code of conduct" />
            <button className="button-secondary button-small">Record</button>
          </form>
        </details>
      )}
    </article>
  );
}

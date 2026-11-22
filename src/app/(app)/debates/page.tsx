import Link from "next/link";
import { requireMember } from "@/lib/auth/dal";
import { getDebates } from "@/lib/queries";
import { formatDate, timeUntil } from "@/lib/format";

export const metadata = { title: "Debates" };

export default async function DebatesPage() {
  await requireMember();
  const debates = await getDebates();

  return (
    <div className="narrow">
      <div className="page-head">
        <div>
          <h1>Debates</h1>
          <p className="lede">
            Formal debates on a motion. Members record a position before and after, so we can see which arguments
            change minds.
          </p>
        </div>
        <Link href="/debates/new" className="button">
          Table a motion
        </Link>
      </div>

      <div className="stack">
        {debates.map(({ debate, proposer, contributions, participants }) => (
          <Link key={debate.id} href={`/debates/${debate.id}`} className="card debate-summary">
            <div className="row-between">
              <span className={`status status-${debate.status}`}>{debate.status === "open" ? "Open" : "Closed"}</span>
              <span className="muted small">
                {debate.status === "open" && debate.closesAt
                  ? `Closes ${timeUntil(debate.closesAt)}`
                  : debate.closedAt
                    ? `Closed ${formatDate(debate.closedAt)}`
                    : null}
              </span>
            </div>
            <h2 className="motion">{debate.motion}</h2>
            <div className="row-between muted small">
              <span>Proposed by {proposer.displayName}</span>
              <span>
                {contributions} contributions · {participants} members voting
              </span>
            </div>
          </Link>
        ))}
        {debates.length === 0 && (
          <div className="card">
            <p>No debates yet. Table the first motion.</p>
          </div>
        )}
      </div>
    </div>
  );
}

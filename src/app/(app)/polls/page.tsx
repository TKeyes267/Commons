import { requireMember } from "@/lib/auth/dal";
import { getPolls } from "@/lib/queries";
import { createPoll, votePoll } from "@/app/actions/polls";
import { ActionForm } from "@/components/ActionForm";
import { ROLE_LABELS } from "@/lib/roles";
import { ROLES } from "@/db/schema";
import { timeUntil } from "@/lib/format";

export const metadata = { title: "Polls" };

export default async function PollsPage() {
  const { user } = await requireMember();
  const polls = await getPolls();

  return (
    <div className="narrow">
      <h1>Polls</h1>
      <p className="lede">
        Every vote comes from a verified person, and results are broken down by role, so officials can see what
        citizens think and citizens can see what officials think.
      </p>

      <details className="card create-poll">
        <summary>Ask a question</summary>
        <ActionForm action={createPoll} submitLabel="Publish poll">
          <label>
            <span className="label">Question</span>
            <input name="question" required minLength={10} maxLength={200} />
          </label>
          <label>
            <span className="label">Context (optional)</span>
            <textarea name="context" rows={2} maxLength={1000} />
          </label>
          <fieldset>
            <legend className="label">Options</legend>
            {[0, 1, 2, 3].map((i) => (
              <input key={i} name="option" maxLength={80} required={i < 2} placeholder={`Option ${i + 1}${i < 2 ? "" : " (optional)"}`} />
            ))}
          </fieldset>
          <label>
            <span className="label">Open for</span>
            <select name="days" defaultValue="7">
              <option value="1">1 day</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </label>
        </ActionForm>
      </details>

      <div className="stack">
        {polls.map(({ poll, author, options, votes }) => {
          const myVote = votes.find((v) => v.userId === user.id);
          const closed = !!poll.closesAt && poll.closesAt < new Date();
          const showResults = !!myVote || closed;
          const total = votes.length;
          const rolesVoting = ROLES.filter((r) => votes.some((v) => v.role === r));
          return (
            <article key={poll.id} className="card poll">
              <p className="muted small">
                Asked by {author.displayName} · {total} votes
                {poll.closesAt && !closed && ` · closes ${timeUntil(poll.closesAt)}`}
                {closed && " · closed"}
              </p>
              <h2>{poll.question}</h2>
              {poll.context && <p className="muted">{poll.context}</p>}

              {showResults ? (
                <>
                  <ul className="poll-results">
                    {options.map((o) => {
                      const n = votes.filter((v) => v.optionId === o.id).length;
                      const pct = total ? Math.round((n / total) * 100) : 0;
                      return (
                        <li key={o.id} className={myVote?.optionId === o.id ? "mine" : undefined}>
                          <div className="row-between small">
                            <span>
                              {o.label}
                              {myVote?.optionId === o.id && " (your vote)"}
                            </span>
                            <span>{pct}%</span>
                          </div>
                          <div className="meter">
                            <span style={{ width: `${pct}%` }} />
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  {rolesVoting.length > 0 && (
                    <details className="breakdown">
                      <summary>Results by verified role</summary>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th scope="col">Option</th>
                              {rolesVoting.map((r) => (
                                <th key={r} scope="col">
                                  {ROLE_LABELS[r]}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {options.map((o) => (
                              <tr key={o.id}>
                                <th scope="row">{o.label}</th>
                                {rolesVoting.map((r) => (
                                  <td key={r}>{votes.filter((v) => v.role === r && v.optionId === o.id).length}</td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </details>
                  )}
                </>
              ) : (
                <form action={votePoll} className="poll-options">
                  {options.map((o) => (
                    <button key={o.id} name="optionId" value={o.id} className="button-secondary">
                      {o.label}
                    </button>
                  ))}
                </form>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

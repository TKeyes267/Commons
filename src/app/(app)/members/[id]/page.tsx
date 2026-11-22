import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/dal";
import { getMember } from "@/lib/queries";
import { toggleFollow } from "@/app/actions/posts";
import { PostCard } from "@/components/PostCard";
import { ROLE_LABELS, KIND_LABELS } from "@/lib/roles";
import { formatDate } from "@/lib/format";
import { isUuid } from "@/lib/ids";

export default async function MemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { user } = await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const data = await getMember(id, user.id);
  if (!data) notFound();
  const { member, recentPosts, recentContributions, followers, isFollowing } = data;
  const isSelf = member.id === user.id;

  return (
    <div className="narrow">
      <header className="card profile">
        <div className="row-between">
          <div>
            <h1>{member.displayName}</h1>
            <span className={`badge badge-${member.role}`}>
              ✓ {member.protectedVoice ? "Verified Citizen (Protected Voice)" : ROLE_LABELS[member.role]}
            </span>
          </div>
          {!isSelf && !member.protectedVoice && (
            <form action={toggleFollow}>
              <input type="hidden" name="userId" value={member.id} />
              <button className={isFollowing ? "button-secondary" : undefined}>{isFollowing ? "Following" : "Follow"}</button>
            </form>
          )}
        </div>

        {member.protectedVoice ? (
          <p className="muted">
            This member&rsquo;s identity has been verified by Commons, but is not shown publicly. Protected Voice is for
            people who cannot safely speak under their own name, such as public-sector workers and whistleblowers.
          </p>
        ) : (
          <dl className="facts">
            {member.office && (
              <>
                <dt>Office</dt>
                <dd>{member.office}</dd>
              </>
            )}
            {member.organisation && (
              <>
                <dt>Organisation</dt>
                <dd>{member.organisation}</dd>
              </>
            )}
            {member.constituency && (
              <>
                <dt>Constituency</dt>
                <dd>{member.constituency}</dd>
              </>
            )}
            {member.declaredInterests && (
              <>
                <dt>Declared interests</dt>
                <dd>{member.declaredInterests}</dd>
              </>
            )}
            <dt>Member since</dt>
            <dd>{formatDate(member.createdAt)}</dd>
            <dt>Followers</dt>
            <dd>{followers}</dd>
          </dl>
        )}
        {member.bio && <p>{member.bio}</p>}
      </header>

      {recentContributions.length > 0 && (
        <section>
          <h2>Debate contributions</h2>
          <ul className="plain stack-sm">
            {recentContributions.map(({ contribution: c, debate }) => (
              <li key={c.id} className="card">
                <span className={`kind kind-${c.kind}`}>
                  {KIND_LABELS[c.kind]} · {c.side === "for" ? "For" : "Against"}
                </span>
                <Link href={`/debates/${debate.id}#c-${c.id}`} className="motion-link">
                  {debate.motion}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Posts</h2>
        <div className="stack">
          {recentPosts.length === 0 && <p className="muted">No posts yet.</p>}
          {recentPosts.map(({ post, author, replies }) => (
            <PostCard key={post.id} post={post} author={author} replies={replies} />
          ))}
        </div>
      </section>
    </div>
  );
}

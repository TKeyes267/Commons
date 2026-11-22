import Link from "next/link";
import { requireMember } from "@/lib/auth/dal";
import { getFeed, type FeedView } from "@/lib/queries";
import { createPost } from "@/app/actions/posts";
import { ActionForm } from "@/components/ActionForm";
import { PostCard } from "@/components/PostCard";

const VIEWS: { id: FeedView; label: string }[] = [
  { id: "all", label: "All members" },
  { id: "following", label: "Following" },
  { id: "officials", label: "Elected officials" },
];

export default async function ChamberPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { user } = await requireMember();
  const { view: rawView } = await searchParams;
  const view = VIEWS.find((v) => v.id === rawView)?.id ?? "all";
  const feed = await getFeed(user.id, view);

  return (
    <div className="two-col">
      <section>
        <h1>The Chamber</h1>
        <p className="lede">The floor is open. Every member here is a verified person.</p>

        <div className="card compose">
          <ActionForm action={createPost} submitLabel="Post">
            <label className="sr-only" htmlFor="body">
              Your post
            </label>
            <textarea
              id="body"
              name="body"
              rows={3}
              maxLength={1000}
              placeholder="Make your point. Challenge arguments, not people."
              required
            />
            <div className="row">
              <input name="citationUrl" type="url" placeholder="Source link (optional)" aria-label="Source link" />
              <input name="topic" placeholder="Topic (optional)" maxLength={40} aria-label="Topic" />
            </div>
          </ActionForm>
        </div>

        <div className="tabs">
          {VIEWS.map((v) => (
            <Link
              key={v.id}
              href={v.id === "all" ? "/" : `/?view=${v.id}`}
              className={view === v.id ? "active" : undefined}
              aria-current={view === v.id ? "page" : undefined}
            >
              {v.label}
            </Link>
          ))}
        </div>

        <div className="stack">
          {feed.length === 0 && <p className="muted">Nothing here yet.</p>}
          {feed.map(({ post, author, replies }) => (
            <PostCard key={post.id} post={post} author={author} replies={replies} />
          ))}
        </div>
      </section>

      <aside className="sidebar">
        <div className="card">
          <h2>How Commons works</h2>
          <ul className="plain">
            <li>
              <strong>The Chamber</strong> is the open floor for posts and replies.
            </li>
            <li>
              <strong>Debates</strong> are formal: a motion, two sides, and a vote before and after.
            </li>
            <li>
              <strong>Polls</strong> show results broken down by verified role.
            </li>
          </ul>
          <Link href="/debates/new" className="button">
            Table a motion
          </Link>
        </div>
      </aside>
    </div>
  );
}

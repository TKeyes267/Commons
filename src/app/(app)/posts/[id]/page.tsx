import Link from "next/link";
import { notFound } from "next/navigation";
import { requireMember } from "@/lib/auth/dal";
import { getThread } from "@/lib/queries";
import { createPost } from "@/app/actions/posts";
import { ActionForm } from "@/components/ActionForm";
import { PostCard } from "@/components/PostCard";
import { isUuid } from "@/lib/ids";

export default async function ThreadPage({ params }: { params: Promise<{ id: string }> }) {
  await requireMember();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const thread = await getThread(id);
  if (!thread) notFound();
  const { root, replies } = thread;

  return (
    <div className="narrow">
      <p className="breadcrumb">
        <Link href={root.post.parentId ? `/posts/${root.post.parentId}` : "/"}>← Back</Link>
      </p>
      <PostCard post={root.post} author={root.author} replies={root.replies} linkToThread={false} />

      <div className="card compose">
        <ActionForm action={createPost} submitLabel="Reply">
          <input type="hidden" name="parentId" value={root.post.id} />
          <label className="sr-only" htmlFor="body">
            Your reply
          </label>
          <textarea id="body" name="body" rows={3} maxLength={1000} placeholder="Reply to this post" required />
          <input name="citationUrl" type="url" placeholder="Source link (optional)" aria-label="Source link" />
        </ActionForm>
      </div>

      <h2>
        {replies.length} {replies.length === 1 ? "reply" : "replies"}
      </h2>
      <div className="stack replies">
        {replies.map(({ post, author, replies: n }) => (
          <PostCard key={post.id} post={post} author={author} replies={n} />
        ))}
      </div>
    </div>
  );
}

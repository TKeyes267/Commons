import Link from "next/link";
import type { Post, User } from "@/db/schema";
import { MemberName } from "./MemberName";
import { Citation } from "./Citation";
import { timeAgo } from "@/lib/format";

export function PostCard({
  post,
  author,
  replies,
  linkToThread = true,
}: {
  post: Post;
  author: User;
  replies: number;
  linkToThread?: boolean;
}) {
  return (
    <article className="card post">
      <header className="card-header">
        <MemberName user={author} />
        <time dateTime={post.createdAt.toISOString()} className="muted small">
          {timeAgo(post.createdAt)}
        </time>
      </header>
      {post.topic && <span className="topic">{post.topic}</span>}
      <p className="body">{post.body}</p>
      {post.citationUrl && <Citation url={post.citationUrl} />}
      {linkToThread && (
        <footer className="card-footer">
          <Link href={`/posts/${post.id}`}>
            {replies === 0 ? "Reply" : `${replies} ${replies === 1 ? "reply" : "replies"}`}
          </Link>
        </footer>
      )}
    </article>
  );
}

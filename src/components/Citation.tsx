import { hostname } from "@/lib/format";

export function Citation({ url }: { url: string }) {
  return (
    <a className="citation" href={url} target="_blank" rel="noopener noreferrer nofollow">
      <span aria-hidden>§</span> Source: {hostname(url)}
    </a>
  );
}

import Link from "next/link";
import { getCurrentMember } from "@/lib/auth/dal";
import { signOut } from "@/app/actions/auth";
import { formatTime } from "@/lib/format";
import { Nav } from "./Nav";

export async function SiteHeader() {
  const current = await getCurrentMember();
  return (
    <>
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="brand">
            <span className="brand-mark" aria-hidden>
              ▣
            </span>
            Commons
          </Link>
          {current && <Nav />}
          {current ? (
            <div className="session">
              <Link href={`/members/${current.user.id}`} className="session-name">
                {current.user.displayName}
              </Link>
              <span className="session-status" title={`Assurance level ${current.session.assuranceLevel}`}>
                <span className="dot" aria-hidden /> Verified {formatTime(current.session.verifiedAt)} · re-verify
                by {formatTime(current.session.expiresAt)}
              </span>
              <form action={signOut}>
                <button className="button-link">Sign out</button>
              </form>
            </div>
          ) : (
            <Link href="/signin" className="button button-small">
              Sign in
            </Link>
          )}
        </div>
      </header>
      <div className="prototype-banner">
        Prototype: identity checks are simulated and all demo members are fictional.
      </div>
    </>
  );
}

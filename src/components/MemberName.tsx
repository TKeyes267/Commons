import Link from "next/link";
import type { User } from "@/db/schema";
import { ROLE_LABELS } from "@/lib/roles";

/** Name, verified role and affiliation, shown on every post and contribution. */
export function MemberName({ user, compact = false }: { user: User; compact?: boolean }) {
  const affiliation = user.protectedVoice
    ? user.constituency
    : (user.office ?? user.organisation ?? user.constituency);
  return (
    <div className="member">
      <span className="member-line">
        <Link href={`/members/${user.id}`} className="member-name">
          {user.displayName}
        </Link>
        <span className={`badge badge-${user.role}`} title="Identity verified">
          ✓ {user.protectedVoice ? "Verified Citizen (Protected Voice)" : ROLE_LABELS[user.role]}
        </span>
      </span>
      {!compact && affiliation && <span className="member-affiliation">{affiliation}</span>}
      {!compact && user.declaredInterests && (
        <span className="interest">Declared interest: {user.declaredInterests}</span>
      )}
    </div>
  );
}

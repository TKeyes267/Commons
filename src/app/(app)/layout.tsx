import Link from "next/link";
import { requireMember } from "@/lib/auth/dal";
import { SiteHeader } from "@/components/SiteHeader";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireMember();
  return (
    <>
      <SiteHeader />
      <main className="container">{children}</main>
      <footer className="site-footer container">
        <Link href="/conduct">Code of conduct</Link>
      </footer>
    </>
  );
}

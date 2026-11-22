import { redirect } from "next/navigation";
import { getCurrentMember } from "@/lib/auth/dal";
import { getDemoMembers } from "@/lib/queries";
import { signInAsDemoMember, verifyIdentity } from "@/app/actions/auth";
import { ActionForm } from "@/components/ActionForm";
import { ROLE_LABELS } from "@/lib/roles";

export const metadata = { title: "Verify your identity" };

export default async function SignInPage() {
  if (await getCurrentMember()) redirect("/");
  const demo = await getDemoMembers();

  return (
    <main className="signin">
      <div className="signin-intro">
        <div className="brand brand-large">
          <span className="brand-mark" aria-hidden>
            ▣
          </span>
          Commons
        </div>
        <p className="lede">Grown-up social media for digital democracies.</p>
        <p>
          Every member of Commons is a verified person. You confirm your identity each time you visit, so every post,
          vote and debate contribution comes from a real person.
        </p>
        <p className="prototype-note">
          <strong>Prototype.</strong> Identity checks are simulated. In the real service you would verify through
          GOV.UK One Login or another certified digital identity provider. Commons never sees or stores your documents.
        </p>
      </div>

      <div className="signin-panels">
        <section className="card">
          <h2>Verify your identity</h2>
          <p className="muted small">Simulated GOV.UK One Login check</p>
          <ActionForm action={verifyIdentity} submitLabel="Verify and continue">
            <label>
              <span className="label">Full legal name</span>
              <input name="name" autoComplete="name" required />
            </label>
            <label>
              <span className="label">Postcode</span>
              <span className="hint">Used once to find your constituency, then discarded.</span>
              <input name="postcode" autoComplete="postal-code" required className="input-short" />
            </label>
          </ActionForm>
        </section>

        <section className="card">
          <h2>Or explore as a demo member</h2>
          <p className="muted small">Fictional members with different verified roles.</p>
          <ul className="demo-list">
            {demo.map((m) => (
              <li key={m.id}>
                <form action={signInAsDemoMember}>
                  <input type="hidden" name="userId" value={m.id} />
                  <button className="demo-member">
                    <strong>{m.displayName}</strong>
                    <span>{m.protectedVoice ? "Protected Voice citizen" : ROLE_LABELS[m.role]}</span>
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

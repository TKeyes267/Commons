import Link from "next/link";
import { requireMember } from "@/lib/auth/dal";
import { createDebate } from "@/app/actions/debates";
import { ActionForm } from "@/components/ActionForm";

export const metadata = { title: "Table a motion" };

export default async function NewDebatePage() {
  await requireMember();
  return (
    <div className="narrow">
      <p className="breadcrumb">
        <Link href="/debates">← Debates</Link>
      </p>
      <h1>Table a motion</h1>
      <p className="lede">
        A motion is a clear proposition that members can argue for or against. You will chair the debate: you can
        call contributions to order and close the debate.
      </p>
      <div className="card">
        <ActionForm action={createDebate} submitLabel="Open the debate">
          <label>
            <span className="label">Motion</span>
            <div className="motion-input">
              <span>This House believes</span>
              <input name="motion" required minLength={10} maxLength={200} placeholder="that…" />
            </div>
          </label>
          <label>
            <span className="label">Briefing</span>
            <span className="hint">
              A neutral summary of the issue: the background, the main positions on each side, and key facts. Write it
              so that both sides would accept it as fair.
            </span>
            <textarea name="briefing" rows={7} required minLength={40} maxLength={4000} />
          </label>
          <label>
            <span className="label">Length of debate</span>
            <select name="days" defaultValue="7">
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </label>
        </ActionForm>
      </div>
    </div>
  );
}

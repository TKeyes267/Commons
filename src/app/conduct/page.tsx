import { SiteHeader } from "@/components/SiteHeader";

export const metadata = { title: "Code of conduct" };

const RULES = [
  ["Speak as yourself", "Every member is verified. Do not post on behalf of others without saying so, and declare any interest that a reasonable person would want to know."],
  ["Challenge arguments, not people", "Criticise positions, policies and evidence. Do not insult, mock or attack other members, or speculate about their motives."],
  ["Support your claims", "When you state a fact or a figure, cite a source. If you are corrected with good evidence, acknowledge it."],
  ["Represent others fairly", "Describe opposing views in terms their holders would accept before you rebut them."],
  ["Respect the chair", "The chair of a debate keeps order. Contributions called to order remain on the record with the chair's note."],
  ["Keep to the motion", "In formal debates, address the motion being debated. Use the Chamber for wider discussion."],
  ["Officials are on the record", "Posts by elected officials cannot be deleted. They form part of the public record."],
  ["No campaigning in debates", "Debates are for argument, not for canvassing, fundraising or advertising."],
];

export default function ConductPage() {
  return (
    <>
      <SiteHeader />
      <main className="container narrow">
        <h1>Code of conduct</h1>
        <p className="lede">
          Commons follows the spirit of parliamentary standing orders: robust disagreement, conducted with courtesy.
        </p>
        <ol className="rules">
          {RULES.map(([title, text]) => (
            <li key={title} className="card">
              <h2>{title}</h2>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <section className="card">
          <h2>Pause before posting</h2>
          <p>
            Before anything is published, Commons checks it for personal attacks, shouting and unsourced figures. If
            there is a concern, you are asked whether you would like to revise. You can still post as written: the check
            is a nudge, not a censor.
          </p>
        </section>
      </main>
    </>
  );
}

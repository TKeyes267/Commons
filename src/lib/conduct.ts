/**
 * "Pause before posting".
 *
 * A gentle check run before anything is published. It never blocks a post on
 * its own: it explains the concern and asks the member whether they would like
 * to revise. The prototype uses simple heuristics; a later version will use a
 * language model with a published, auditable rubric.
 */
export interface ConductConcern {
  code: string;
  message: string;
}

const PERSONAL_ATTACKS = [
  "idiot", "moron", "stupid", "liar", "clown", "traitor", "scum", "pathetic",
  "brainless", "shut up", "snowflake", "loser", "imbecile", "cretin",
];

export function reviewConduct(text: string, opts: { hasCitation: boolean }): ConductConcern[] {
  const concerns: ConductConcern[] = [];
  const lower = text.toLowerCase();

  const attack = PERSONAL_ATTACKS.find((w) => new RegExp(`\\b${w}\\b`).test(lower));
  if (attack) {
    concerns.push({
      code: "personal",
      message: `"${attack}" reads as a personal attack. Commons asks members to challenge arguments, not people.`,
    });
  }

  const letters = text.replace(/[^a-zA-Z]/g, "");
  const capitals = text.replace(/[^A-Z]/g, "");
  if (letters.length > 20 && capitals.length / letters.length > 0.6) {
    concerns.push({ code: "shouting", message: "Most of this is in capitals, which reads as shouting." });
  }

  if (/[!?]{3,}/.test(text)) {
    concerns.push({ code: "punctuation", message: "Repeated punctuation can come across as heated." });
  }

  const statistic = /\b\d+(\.\d+)?\s?(%|(percent|per cent|million|billion|bn|m)\b)/i.test(text);
  if (statistic && !opts.hasCitation) {
    concerns.push({
      code: "unsourced",
      message: "This includes a figure without a source. Adding a citation helps others check it.",
    });
  }

  return concerns;
}

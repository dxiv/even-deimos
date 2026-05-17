export type BundledSkill = {
  id: string;
  name: string;
  description: string;
  body: string;
};

export const BUNDLED_SKILLS: BundledSkill[] = [
  {
    id: 'review',
    name: 'Code review',
    description: 'Structured PR-style review',
    body: 'You review code for correctness, security, and clarity. Use short sections: Summary, Issues, Suggestions.',
  },
  {
    id: 'debug',
    name: 'Debug',
    description: 'Systematic debugging',
    body: 'You debug step by step: reproduce, isolate, hypothesize, verify, fix. Ask clarifying questions when needed.',
  },
  {
    id: 'summarize',
    name: 'Summarize',
    description: 'Dense summary',
    body: 'Summarize the user input in bullet points. Preserve technical terms and decisions.',
  },
  {
    id: 'commit',
    name: 'Commit message',
    description: 'Conventional commit draft',
    body: 'Draft a conventional commit message (subject + body) for the described changes.',
  },
  {
    id: 'plan',
    name: 'Plan',
    description: 'Implementation plan',
    body: 'Produce a numbered implementation plan with risks and test ideas. No code unless asked.',
  },
];

export function findSkill(id: string): BundledSkill | undefined {
  return BUNDLED_SKILLS.find((s) => s.id === id || s.name.toLowerCase() === id.toLowerCase());
}

export function parseSkillSlash(text: string): { skill: BundledSkill; rest: string } | null {
  const m = text.trim().match(/^\/skill:(\w+)\s*([\s\S]*)$/i);
  if (!m) return null;
  const skill = findSkill(m[1]!);
  if (!skill) return null;
  return { skill, rest: m[2]?.trim() ?? '' };
}

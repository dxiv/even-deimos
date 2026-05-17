export type SlashCommand = {
  name: string;
  description: string;
  kind: 'action' | 'prompt';
  promptSuffix?: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'Commands & skills', kind: 'action' },
  { name: 'clear', description: 'New chat', kind: 'action' },
  { name: 'new', description: 'New chat', kind: 'action' },
  { name: 'compact', description: 'Summarize long thread', kind: 'action' },
  { name: 'provider', description: 'Open provider settings', kind: 'action' },
  { name: 'model', description: 'Open settings (model)', kind: 'action' },
  { name: 'mcp', description: 'MCP servers', kind: 'action' },
  { name: 'skills', description: 'Browse skills', kind: 'action' },
  { name: 'export', description: 'Copy chat as markdown', kind: 'action' },
  {
    name: 'review',
    description: 'Code review mode',
    kind: 'prompt',
    promptSuffix: 'Review the following like a senior engineer. Be concise.',
  },
  {
    name: 'explain',
    description: 'Explain simply',
    kind: 'prompt',
    promptSuffix: 'Explain the following clearly for a skilled developer.',
  },
  {
    name: 'debug',
    description: 'Debug mode',
    kind: 'prompt',
    promptSuffix: 'Help debug the following. List hypotheses and next steps.',
  },
  {
    name: 'summarize',
    description: 'Summarize',
    kind: 'prompt',
    promptSuffix: 'Summarize in bullet points. Preserve technical terms.',
  },
  {
    name: 'plan',
    description: 'Implementation plan',
    kind: 'prompt',
    promptSuffix: 'Produce a numbered plan with risks and test ideas.',
  },
  {
    name: 'commit',
    description: 'Commit message',
    kind: 'prompt',
    promptSuffix: 'Draft a conventional commit message for the described changes.',
  },
];

export function findSlashCommand(name: string): SlashCommand | undefined {
  const n = name.replace(/^\//, '').toLowerCase();
  return SLASH_COMMANDS.find((c) => c.name === n);
}

export function slashSuggestions(partial: string): SlashCommand[] {
  const p = partial.replace(/^\//, '').toLowerCase();
  if (!p) return SLASH_COMMANDS;
  return SLASH_COMMANDS.filter((c) => c.name.startsWith(p));
}

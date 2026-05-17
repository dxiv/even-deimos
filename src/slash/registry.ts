export type SlashCommand = {
  name: string;
  description: string;
  kind: 'action' | 'prompt';
  promptSuffix?: string;
};

export const SLASH_COMMANDS: SlashCommand[] = [
  { name: 'help', description: 'List commands', kind: 'action' },
  { name: 'clear', description: 'New chat', kind: 'action' },
  { name: 'compact', description: 'Summarize long thread', kind: 'action' },
  { name: 'provider', description: 'Open provider settings', kind: 'action' },
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

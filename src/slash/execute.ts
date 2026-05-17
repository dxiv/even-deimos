import { findSlashCommand } from './registry';

export type SlashAction =
  | 'help'
  | 'clear'
  | 'compact'
  | 'provider'
  | 'new'
  | 'model'
  | 'mcp'
  | 'skills'
  | 'export';

export type SlashResult =
  | { handled: true; action: SlashAction }
  | { handled: true; action: 'prompt'; userText: string }
  | { handled: false; userText: string };

export function executeSlashInput(raw: string): SlashResult {
  const text = raw.trim();
  if (!text.startsWith('/')) return { handled: false, userText: text };

  const [cmdName, ...rest] = text.slice(1).split(/\s+/);
  const cmd = findSlashCommand(cmdName ?? '');
  if (!cmd) return { handled: false, userText: text };

  if (cmd.kind === 'action') {
    return { handled: true, action: cmd.name as SlashAction };
  }

  const tail = rest.join(' ').trim();
  const userText = tail ? `${cmd.promptSuffix}\n\n${tail}` : (cmd.promptSuffix ?? '');
  return { handled: true, action: 'prompt', userText };
}

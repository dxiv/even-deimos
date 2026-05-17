import type { ChatSession, SessionStore } from './agent/sessions';
import { sessionDisplayTitle } from './agent/sessions';

export function sessionToMarkdown(session: ChatSession, all: ChatSession[]): string {
  const title = sessionDisplayTitle(session, all);
  const lines = [`# ${title}`, ''];
  for (const m of session.messages) {
    const who = m.role === 'user' ? 'You' : m.role === 'assistant' ? 'Deimos' : 'System';
    lines.push(`## ${who}`, '', m.content, '');
  }
  return lines.join('\n');
}

export function exportStoreJson(store: SessionStore): string {
  return JSON.stringify(store, null, 2);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function importStoreJson(raw: string): SessionStore | null {
  try {
    const j = JSON.parse(raw) as SessionStore;
    if (!j || !Array.isArray(j.sessions) || typeof j.activeId !== 'string') return null;
    return j;
  } catch {
    return null;
  }
}

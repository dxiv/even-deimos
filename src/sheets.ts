import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { BUNDLED_SKILLS } from './skills/bundled';
import { loadSkillStore } from './agent/skills/store';
import { SLASH_COMMANDS } from './slash/registry';

let skillsBridge: EvenAppBridge | null = null;

export function setSkillsBridge(bridge: EvenAppBridge | null): void {
  skillsBridge = bridge;
}

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

export function openHelpSheet(): void {
  const sheet = $('dm-help-sheet');
  const body = $('dm-help-body');
  if (!sheet || !body) return;
  body.replaceChildren();
  for (const c of SLASH_COMMANDS) {
    const p = document.createElement('p');
    p.className = 'dm-help-line';
    p.textContent = `/${c.name} — ${c.description}`;
    body.appendChild(p);
  }
  const h = document.createElement('p');
  h.className = 'dm-settings-block__title';
  h.textContent = 'Bundled skills';
  body.appendChild(h);
  for (const s of BUNDLED_SKILLS) {
    const p = document.createElement('p');
    p.className = 'dm-help-line';
    p.textContent = `/skill:${s.id} — ${s.description}`;
    body.appendChild(p);
  }
  sheet.hidden = false;
}

export function closeHelpSheet(): void {
  const sheet = $('dm-help-sheet');
  if (sheet) sheet.hidden = true;
}

export function wireHelpSheet(): void {
  $('dm-help-close')?.addEventListener('click', () => closeHelpSheet());
  $('dm-help-backdrop')?.addEventListener('click', () => closeHelpSheet());
}

export type SkillPickHandler = (skillId: string, body: string) => void;

let onSkillPick: SkillPickHandler | null = null;

export function setSkillPickHandler(h: SkillPickHandler | null): void {
  onSkillPick = h;
}

function appendSkillRow(
  list: HTMLElement,
  id: string,
  name: string,
  description: string,
  body: string,
): void {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'dm-skill-row mono';
  btn.innerHTML = `<strong>${name}</strong><span>${description}</span>`;
  btn.addEventListener('click', () => {
    onSkillPick?.(id, body);
    closeSkillsSheet();
  });
  list.appendChild(btn);
}

export async function openSkillsSheet(): Promise<void> {
  const sheet = $('dm-skills-sheet');
  const list = $('dm-skills-list');
  if (!sheet || !list) return;
  list.replaceChildren();
  for (const s of BUNDLED_SKILLS) {
    appendSkillRow(list, s.id, s.name, s.description, s.body);
  }
  const custom = await loadSkillStore(skillsBridge);
  if (custom.skills.length) {
    const h = document.createElement('p');
    h.className = 'dm-settings-block__title';
    h.textContent = 'Custom skills';
    list.appendChild(h);
    for (const s of custom.skills) {
      appendSkillRow(list, s.id, s.name, s.description, s.body);
    }
  }
  sheet.hidden = false;
}

export function closeSkillsSheet(): void {
  const sheet = $('dm-skills-sheet');
  if (sheet) sheet.hidden = true;
}

export function wireSkillsSheet(): void {
  $('dm-skills-close')?.addEventListener('click', () => closeSkillsSheet());
  $('dm-skills-backdrop')?.addEventListener('click', () => closeSkillsSheet());
}

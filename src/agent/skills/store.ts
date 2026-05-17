import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { loadJson, saveJson } from '../storage';

export type CustomSkill = {
  id: string;
  name: string;
  description: string;
  body: string;
};

export type SkillStore = {
  skills: CustomSkill[];
};

const SKILLS_STORAGE_KEY = 'deimos:v1:custom_skills';

export async function loadSkillStore(bridge: EvenAppBridge | null): Promise<SkillStore> {
  return (await loadJson<SkillStore>(bridge, SKILLS_STORAGE_KEY)) ?? { skills: [] };
}

export async function saveSkillStore(bridge: EvenAppBridge | null, store: SkillStore): Promise<void> {
  await saveJson(bridge, SKILLS_STORAGE_KEY, store);
}

export function newSkillId(): string {
  return `sk_${Date.now().toString(36)}`;
}

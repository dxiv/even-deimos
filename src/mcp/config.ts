import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { MCP_STORAGE_KEY } from '../agent/types';
import { loadJson, saveJson } from '../agent/storage';

export type McpServerConfig = {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
};

export type McpStore = {
  servers: McpServerConfig[];
};

export async function loadMcpStore(bridge: EvenAppBridge | null): Promise<McpStore> {
  return (await loadJson<McpStore>(bridge, MCP_STORAGE_KEY)) ?? { servers: [] };
}

export async function saveMcpStore(bridge: EvenAppBridge | null, store: McpStore): Promise<void> {
  await saveJson(bridge, MCP_STORAGE_KEY, store);
}

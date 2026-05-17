import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { loadMcpStore, saveMcpStore, type McpServerConfig, type McpStore } from './config';
import { listMcpTools } from './hubClient';
import { newMcpServerId, syncMcpToolsToRegistry } from './registerMcpTools';

let store: McpStore = { servers: [] };
let bridgeRef: EvenAppBridge | null = null;

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function renderMcpList(): void {
  const el = $('dm-mcp-list');
  if (!el) return;
  el.replaceChildren();
  if (!store.servers.length) {
    const p = document.createElement('p');
    p.className = 'dm-field-hint';
    p.textContent = 'No MCP servers. Add a URL to expose tools to the agent.';
    el.appendChild(p);
    return;
  }
  for (const s of store.servers) {
    const row = document.createElement('div');
    row.className = 'dm-mcp-row';
    const label = document.createElement('span');
    label.textContent = `${s.enabled ? '●' : '○'} ${s.name}`;
    const url = document.createElement('span');
    url.className = 'dm-field-hint';
    url.textContent = s.url;
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'dm-btn dm-btn--ghost';
    toggle.textContent = s.enabled ? 'Disable' : 'Enable';
    toggle.addEventListener('click', () => {
      s.enabled = !s.enabled;
      void persistAndSync();
    });
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'dm-btn dm-btn--ghost';
    del.textContent = 'Remove';
    del.addEventListener('click', () => {
      store = { servers: store.servers.filter((x) => x.id !== s.id) };
      void persistAndSync();
    });
    row.append(label, url, toggle, del);
    el.appendChild(row);
  }
}

async function persistAndSync(): Promise<void> {
  await saveMcpStore(bridgeRef, store);
  renderMcpList();
  const errs = await syncMcpToolsToRegistry(store);
  const status = $('dm-mcp-status');
  if (status) {
    status.textContent = errs.length ? errs.join(' · ') : `${store.servers.filter((s) => s.enabled).length} server(s) synced`;
  }
}

export async function initMcpUi(bridge: EvenAppBridge | null): Promise<void> {
  bridgeRef = bridge;
  store = await loadMcpStore(bridge);
  renderMcpList();
  await syncMcpToolsToRegistry(store);

  $('dm-mcp-add')?.addEventListener('click', () => {
    const nameEl = $('dm-mcp-name') as HTMLInputElement | null;
    const urlEl = $('dm-mcp-url') as HTMLInputElement | null;
    const name = nameEl?.value.trim() || 'MCP server';
    const url = urlEl?.value.trim() || '';
    if (!url) return;
    const server: McpServerConfig = {
      id: newMcpServerId(),
      name,
      url,
      enabled: true,
    };
    store = { servers: [...store.servers, server] };
    if (nameEl) nameEl.value = '';
    if (urlEl) urlEl.value = '';
    void persistAndSync();
  });

  $('dm-mcp-test')?.addEventListener('click', () => {
    void (async () => {
      const urlEl = $('dm-mcp-url') as HTMLInputElement | null;
      const url = urlEl?.value.trim();
      if (!url) return;
      const status = $('dm-mcp-status');
      try {
        const tools = await listMcpTools({ id: 'test', name: 'test', url, enabled: true });
        if (status) status.textContent = `OK — ${tools.length} tool(s): ${tools.slice(0, 5).join(', ')}`;
      } catch (e) {
        if (status) status.textContent = e instanceof Error ? e.message : String(e);
      }
    })();
  });
}

export function getMcpStore(): McpStore {
  return store;
}

export async function refreshMcpTools(): Promise<void> {
  await syncMcpToolsToRegistry(store);
}

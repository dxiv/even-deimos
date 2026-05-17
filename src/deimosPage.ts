import type { EvenAppBridge } from '@evenrealities/even_hub_sdk';
import { runAgentLoop } from './agent/agentLoop';
import { testProviderConnection } from './agent/chatClient';
import { compactMessages, needsCompact } from './agent/compact';
import {
  addProfile,
  deleteProfile,
  getActiveProfile,
  profileToPrefs,
  prefsReadyFromProfile,
  updateProfile,
  type ProfileStore,
} from './agent/providerProfiles';
import {
  loadProfiles,
  loadSessions,
  prefsReady,
  saveProfiles,
  saveSessions,
  type SessionStore,
} from './agent/prefs';
import { streamTetherChat, loadTetherSettings, saveTetherSettings } from './agent/tetherClient';
import { profileFromBackend, type ProviderBackendId } from './agent/providerCatalog';
import type { ChatMessage, ProviderPrefs, StreamEvent, ThemeId } from './agent/types';
import {
  applyBackendToForm,
  baseUrlIsEditable,
  fillModelSelect,
  fillProviderBackendSelect,
  readBackendFromProfile,
  setProviderHint,
} from './providerUi';
import {
  deleteSession,
  newSessionInStore,
  renameSession,
  sessionDisplayTitle,
  switchSession,
  updateActiveMessages,
  getActiveSession,
} from './agent/sessions';
import {
  appendGlassesStream,
  applyStreamEventToGlasses,
  cycleToolStatusOnGlasses,
  getGlassesDisplaySnapshot,
  requestHubExitWithConfirmation,
  runDeimosOnBridge,
  setDeimosBridgeCallbacks,
  setGlassesHeader,
  setGlassesIdleHint,
  setGlassesMainText,
  setGlassesStatus,
  setLensUpgradeThrottleMs,
} from './deimosBridge';
import { renderLensPreview, setLensPreviewHandlers, wireLensPreview } from './lensPreview';
import { executeSlashInput } from './slash/execute';
import { slashSuggestions } from './slash/registry';
import { parseSkillSlash } from './skills/bundled';
import { applyTheme, loadTheme, saveTheme } from './theme';
import { resetScrollableSelect, wireScrollableSelects } from './scrollableSelect';
import { askUserViaSheet, wireAskUserSheet } from './askUser';
import { initMcpUi } from './mcp/mcpUi';
import { loadLensSettings, saveLensSettings, getLensUpgradeThrottleMs } from './lensSettings';
import { initGlassesWidgetsStub } from './glassesWidgets';
import {
  openHelpSheet,
  openSkillsSheet,
  setSkillPickHandler,
  setSkillsBridge,
  wireHelpSheet,
  wireSkillsSheet,
} from './sheets';
import { copyToClipboard, importStoreJson, sessionToMarkdown } from './sessionExport';
import { openImportSheet, setImportHandler, wireImportSheet } from './importSheet';
import {
  hasPendingAttach,
  mergeAttachIntoMessage,
  openAttachSheet,
  wireAttachSheet,
} from './attachContext';

type InitOpts = {
  bridge: EvenAppBridge | null;
  bridgeAbsentReason?: 'browser' | 'timeout';
};

let bridge: EvenAppBridge | null = null;
let messages: ChatMessage[] = [];
let prefs: ProviderPrefs;
let profileStore: ProfileStore;
let sessionStore: SessionStore;
let abortCtrl: AbortController | null = null;
let streaming = false;
let toolsEnabled = true;
let skillSystemSuffix = '';
let tetherMode: 'standalone' | 'tether' = 'standalone';
let messageFilter = '';

function $(id: string): HTMLElement | null {
  return document.getElementById(id);
}

function setStatus(text: string, isError = false): void {
  const out = $('dm-status-line');
  if (out) {
    out.textContent = text;
    out.classList.toggle('dm-status-line--error', isError);
  }
  setGlassesStatus(text.slice(0, 120));
}

function openSettings(): void {
  const sheet = $('dm-settings-sheet');
  if (!sheet) return;
  syncProviderForm();
  const pin = $('dm-session-pin') as HTMLTextAreaElement | null;
  const active = getActiveSession(sessionStore);
  if (pin) pin.value = active.pinnedContext ?? '';
  const banner = $('dm-tether-banner');
  if (banner) banner.hidden = tetherMode !== 'tether';
  sheet.hidden = false;
}

function closeSettings(): void {
  const sheet = $('dm-settings-sheet');
  if (sheet) sheet.hidden = true;
}

function syncSessionPinFromSettings(): void {
  const pin = $('dm-session-pin') as HTMLTextAreaElement | null;
  if (!pin) return;
  const active = getActiveSession(sessionStore);
  sessionStore = {
    ...sessionStore,
    sessions: sessionStore.sessions.map((s) =>
      s.id === active.id ? { ...s, pinnedContext: pin.value.trim() || undefined } : s,
    ),
  };
  void saveSessions(bridge, sessionStore);
}

function wireSettingsSheet(): void {
  $('dm-settings-btn')?.addEventListener('click', () => openSettings());
  $('dm-settings-close')?.addEventListener('click', () => {
    syncSessionPinFromSettings();
    closeSettings();
  });
  $('dm-settings-backdrop')?.addEventListener('click', () => {
    syncSessionPinFromSettings();
    closeSettings();
  });

  $('dm-export-session')?.addEventListener('click', () => {
    void (async () => {
      const active = getActiveSession(sessionStore);
      const md = sessionToMarkdown(active, sessionStore.sessions);
      const ok = await copyToClipboard(md);
      setStatus(ok ? 'chat copied to clipboard' : 'clipboard failed', !ok);
    })();
  });

  $('dm-import-session')?.addEventListener('click', () => openImportSheet());

  $('dm-lens-pace')?.addEventListener('change', (e) => {
    const ms = Number((e.target as HTMLSelectElement).value);
    void (async () => {
      const s = { paceMs: ms };
      await saveLensSettings(bridge, s);
      setLensUpgradeThrottleMs(getLensUpgradeThrottleMs(s));
    })();
  });

}

function syncLensPreview(): void {
  renderLensPreview(getGlassesDisplaySnapshot());
}

function syncGlassesHeader(state: 'idle' | 'thinking' | 'streaming' | 'error'): void {
  setGlassesHeader(prefs, state, getActiveProfile(profileStore).name);
}

function setGlassesPrimaryMode(on: boolean): void {
  document.documentElement.classList.toggle('dm-glasses-primary', on);
  const lens = $('dm-lens-wrap');
  if (lens) lens.classList.toggle('dm-lens--offline', !on);
  const badge = $('dm-bridge-badge');
  if (badge) badge.hidden = !on;
}

function showChatPanel(): void {
  const panel = $('dm-chat-panel');
  const home = document.querySelector('.dm-home');
  if (panel) panel.hidden = false;
  home?.classList.add('dm-home--hidden');
  document.documentElement.classList.add('dm-ready');
}

function formatMsgTime(at?: number): string {
  const d = new Date(at ?? Date.now());
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function profileSelectLabel(p: ReturnType<typeof getActiveProfile>): string {
  const model = p.model?.trim() || 'no model';
  const short = model.length > 16 ? `${model.slice(0, 15)}…` : model;
  return `${p.name} · ${short}`;
}

function renderMessages(): void {
  const el = $('dm-messages');
  if (!el) return;
  el.replaceChildren();
  const frag = document.createDocumentFragment();
  const q = messageFilter.trim().toLowerCase();
  const visible = q
    ? messages.filter((m) => m.content.toLowerCase().includes(q))
    : messages;
  for (const m of visible) {
    const row = document.createElement('div');
    row.className = `dm-msg dm-msg--${m.role}`;
    const head = document.createElement('div');
    head.className = 'dm-msg__head';
    const label = document.createElement('span');
    label.className = 'dm-msg__role';
    label.textContent = m.role === 'user' ? 'You' : m.role === 'system' ? 'System' : 'Deimos';
    const time = document.createElement('span');
    time.className = 'dm-msg__time mono';
    time.textContent = formatMsgTime(m.at);
    head.append(label, time);
    const body = document.createElement('pre');
    body.className = 'dm-msg__body';
    body.textContent = m.content;
    row.append(head, body);
    frag.appendChild(row);
  }
  el.appendChild(frag);
  el.scrollTop = el.scrollHeight;
}

function renderSessionSelect(): void {
  const el = $('dm-session-select') as HTMLSelectElement | null;
  if (!el) return;
  el.replaceChildren();
  const sorted = [...sessionStore.sessions].sort((a, b) => b.updatedAt - a.updatedAt);
  for (const s of sorted) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = sessionDisplayTitle(s, sessionStore.sessions);
    el.appendChild(opt);
  }
  el.value = sessionStore.activeId;
  resetScrollableSelect(el);
}

function renderProfileSelect(): void {
  const el = $('dm-profile-select') as HTMLSelectElement | null;
  const nameEl = $('dm-profile-name') as HTMLInputElement | null;
  if (!el) return;
  el.replaceChildren();
  for (const p of profileStore.profiles) {
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = profileSelectLabel(p);
    el.appendChild(opt);
  }
  el.value = profileStore.activeId;
  if (nameEl) nameEl.value = getActiveProfile(profileStore).name;
  resetScrollableSelect(el);
}

function onBackendChanged(backendId: ProviderBackendId, keepModel?: string): void {
  const modelSelect = $('dm-model') as HTMLSelectElement | null;
  const baseWrap = $('dm-base-url-wrap');
  const baseEl = $('dm-base-url') as HTMLInputElement | null;
  const p = getActiveProfile(profileStore);
  const applied = applyBackendToForm(
    backendId,
    keepModel ? { model: keepModel, baseUrl: p.baseUrl } : undefined,
  );
  if (modelSelect) {
    fillModelSelect(modelSelect, backendId);
    modelSelect.value = applied.model;
    resetScrollableSelect(modelSelect);
  }
  setProviderHint($('dm-provider-hint'), backendId);
  if (baseWrap) baseWrap.hidden = !applied.showBaseUrl;
  if (baseEl) {
    baseEl.value = applied.baseUrl;
    baseEl.readOnly = !baseUrlIsEditable(backendId);
  }
}

function syncProviderForm(): void {
  const p = getActiveProfile(profileStore);
  prefs = profileToPrefs(p);
  const backendEl = $('dm-provider-backend') as HTMLSelectElement | null;
  const keyEl = $('dm-api-key') as HTMLInputElement | null;
  const nameEl = $('dm-profile-name') as HTMLInputElement | null;
  const backendId = readBackendFromProfile(p);
  if (backendEl) backendEl.value = backendId;
  onBackendChanged(backendId, p.model);
  const modelSelect = $('dm-model') as HTMLSelectElement | null;
  if (modelSelect && p.model && [...modelSelect.options].some((o) => o.value === p.model)) {
    modelSelect.value = p.model;
  }
  if (keyEl) keyEl.value = p.apiKey;
  if (nameEl) nameEl.value = p.name;
}

function readProviderForm() {
  const backendEl = $('dm-provider-backend') as HTMLSelectElement | null;
  const modelEl = $('dm-model') as HTMLSelectElement | null;
  const keyEl = $('dm-api-key') as HTMLInputElement | null;
  const baseEl = $('dm-base-url') as HTMLInputElement | null;
  const nameEl = $('dm-profile-name') as HTMLInputElement | null;
  const backendId = (backendEl?.value ?? 'openai') as ProviderBackendId;
  const model = modelEl?.value ?? '';
  const apiKey = keyEl?.value ?? '';
  const base = profileFromBackend(
    backendId,
    model,
    apiKey,
    nameEl?.value.trim() || undefined,
    baseEl?.value,
  );
  return {
    name: nameEl?.value.trim() || base.name || 'Profile',
    backendId,
    providerId: base.providerId!,
    model: base.model!,
    apiKey,
    baseUrl: base.baseUrl,
  };
}

async function persistAll(): Promise<void> {
  sessionStore = updateActiveMessages(sessionStore, messages);
  renderSessionSelect();
  await saveSessions(bridge, sessionStore);
  await saveProfiles(bridge, profileStore);
}

function setStreamingUi(active: boolean): void {
  streaming = active;
  const send = $('dm-send');
  const stop = $('dm-stop');
  const input = $('dm-input') as HTMLTextAreaElement | null;
  if (send) send.toggleAttribute('disabled', active);
  if (stop) stop.hidden = !active;
  if (input) input.disabled = active;
}

async function* streamForUser(
  msgs: ChatMessage[],
  signal: AbortSignal,
): AsyncGenerator<StreamEvent> {
  const active = getActiveSession(sessionStore);
  const pin = active.pinnedContext?.trim();
  let systemPrompt = skillSystemSuffix
    ? `${skillSystemSuffix}\n\nBe concise for AR glasses.`
    : undefined;
  if (pin) {
    systemPrompt = systemPrompt
      ? `${systemPrompt}\n\nSession notes:\n${pin}`
      : `Session notes:\n${pin}\n\nBe concise for AR glasses.`;
  }

  if (tetherMode === 'tether') {
    const ts = await loadTetherSettings(bridge);
    yield* streamTetherChat(ts, msgs, signal);
    return;
  }

  yield* runAgentLoop({
    prefs,
    messages: msgs,
    signal,
    systemPrompt,
    toolsEnabled,
    onAskUser: askUserViaSheet,
  });
}

async function processStream(userMsgs: ChatMessage[]): Promise<void> {
  abortCtrl = new AbortController();
  let assistant = '';
  messages.push({ role: 'assistant', content: '', at: Date.now() });
  const assistantIdx = messages.length - 1;

  try {
    for await (const ev of streamForUser(userMsgs, abortCtrl.signal)) {
      applyStreamEventToGlasses(ev);
      if (ev.type === 'text_chunk') {
        assistant += ev.text;
        messages[assistantIdx] = { role: 'assistant', content: assistant };
        renderMessages();
        syncGlassesHeader('streaming');
        appendGlassesStream(ev.text, assistant);
      } else if (ev.type === 'error') {
        messages.pop();
        renderMessages();
        syncGlassesHeader('error');
        setGlassesMainText(ev.message);
        setStatus(ev.message, true);
        return;
      } else if (ev.type === 'done') {
        assistant = ev.fullText || assistant;
        messages[assistantIdx] = { role: 'assistant', content: assistant };
        renderMessages();
        syncGlassesHeader('idle');
        setGlassesMainText(assistant);
        setStatus('done');
      }
    }
    if (assistant) {
      messages[assistantIdx] = { role: 'assistant', content: assistant };
      await persistAll();
    } else {
      messages.pop();
      renderMessages();
    }
  } catch (e) {
    if (!abortCtrl.signal.aborted) {
      messages.pop();
      renderMessages();
      syncGlassesHeader('error');
      setStatus(e instanceof Error ? e.message : String(e), true);
    }
  } finally {
    setStreamingUi(false);
    abortCtrl = null;
    skillSystemSuffix = '';
  }
}

async function sendChat(userText: string): Promise<void> {
  let text = userText.trim();
  if (!text || streaming) return;
  if (hasPendingAttach()) text = mergeAttachIntoMessage(text);

  const skill = parseSkillSlash(text);
  let payload = text;
  if (skill) {
    skillSystemSuffix = skill.skill.body;
    payload = skill.rest || `Apply the ${skill.skill.name} skill.`;
  } else {
    const slash = executeSlashInput(text);
    if (slash.handled) {
      if (slash.action === 'help') {
        openHelpSheet();
        return;
      }
      if (slash.action === 'clear' || slash.action === 'new') {
        newChat();
        return;
      }
      if (slash.action === 'provider' || slash.action === 'model') {
        openSettings();
        return;
      }
      if (slash.action === 'mcp') {
        openSettings();
        return;
      }
      if (slash.action === 'skills') {
        void openSkillsSheet();
        return;
      }
      if (slash.action === 'export') {
        void (async () => {
          const active = getActiveSession(sessionStore);
          const ok = await copyToClipboard(sessionToMarkdown(active, sessionStore.sessions));
          setStatus(ok ? 'exported to clipboard' : 'export failed', !ok);
        })();
        return;
      }
      if (slash.action === 'compact') {
        if (!prefsReady(prefs)) {
          setStatus('configure provider first', true);
          return;
        }
        setStatus('compacting…');
        try {
          messages = await compactMessages(prefs, messages, new AbortController().signal);
          renderMessages();
          await persistAll();
          setStatus('compacted');
          setGlassesStatus('compacted');
        } catch (e) {
          setStatus(e instanceof Error ? e.message : String(e), true);
        }
        return;
      }
      if (slash.action === 'prompt') payload = slash.userText;
    } else {
      payload = slash.userText;
    }
  }

  if (!prefsReady(prefs)) {
    setStatus('Set API key first', true);
    openSettings();
    return;
  }

  if (needsCompact(messages)) {
    setStatus('thread long — /compact recommended');
  }

  messages.push({ role: 'user', content: payload, at: Date.now() });
  renderMessages();
  await persistAll();
  setStreamingUi(true);
  syncGlassesHeader('thinking');
  setGlassesMainText('');
  setStatus(tetherMode === 'tether' ? 'tether streaming…' : 'streaming…');
  const history = messages.slice(0, -1);
  await processStream(history);
}

function newChat(): void {
  if (abortCtrl) abortCtrl.abort();
  sessionStore = newSessionInStore(sessionStore);
  messages = getActiveSession(sessionStore).messages;
  renderSessionSelect();
  renderMessages();
  void persistAll();
  setGlassesIdleHint();
  setStatus('new chat');
}

function deleteCurrentChat(): void {
  if (abortCtrl) abortCtrl.abort();
  const removed = getActiveSession(sessionStore);
  const hadMessages = removed.messages.length > 0;
  sessionStore = deleteSession(sessionStore, removed.id);
  messages = getActiveSession(sessionStore).messages;
  renderSessionSelect();
  renderMessages();
  void persistAll();
  setGlassesIdleHint();
  setStatus(hadMessages ? 'chat deleted' : 'chat cleared');
}

function showSlashMenu(partial: string): void {
  const menu = $('dm-slash-menu');
  if (!menu) return;
  if (!partial.startsWith('/')) {
    menu.hidden = true;
    return;
  }
  const cmds = slashSuggestions(partial);
  menu.replaceChildren();
  for (const c of cmds) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'dm-slash-item';
    b.textContent = `/${c.name}`;
    b.dataset.cmd = c.name;
    menu.appendChild(b);
  }
  menu.hidden = cmds.length === 0;
}

function wireSlashMenu(): void {
  const input = $('dm-input') as HTMLTextAreaElement | null;
  const menu = $('dm-slash-menu');
  input?.addEventListener('input', () => showSlashMenu(input.value.split('\n').pop() ?? ''));
  menu?.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-cmd]');
    if (!btn || !input) return;
    input.value = `/${btn.dataset.cmd} `;
    menu.hidden = true;
    input.focus();
  });
}

function wireProviderUi(): void {
  const backendSelect = $('dm-provider-backend') as HTMLSelectElement | null;
  if (backendSelect) fillProviderBackendSelect(backendSelect);

  backendSelect?.addEventListener('change', () => {
    onBackendChanged((backendSelect.value as ProviderBackendId) || 'openai');
  });

  $('dm-save-provider')?.addEventListener('click', () => {
    void (async () => {
      const patch = readProviderForm();
      const active = getActiveProfile(profileStore);
      profileStore = updateProfile(profileStore, active.id, patch);
      prefs = profileToPrefs(getActiveProfile(profileStore));
      await persistAll();
      syncProviderForm();
      renderProfileSelect();
      syncGlassesHeader('idle');
      syncLensPreview();
      setStatus('profile saved — lens updated');
      closeSettings();
    })();
  });

  $('dm-test-provider')?.addEventListener('click', () => {
    void (async () => {
      const patch = readProviderForm();
      const active = getActiveProfile(profileStore);
      profileStore = updateProfile(profileStore, active.id, patch);
      prefs = profileToPrefs(getActiveProfile(profileStore));
      setStatus('testing…');
      try {
        const reply = await testProviderConnection(prefs);
        setStatus(`test ok: ${reply.slice(0, 80)}`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : String(e), true);
      }
    })();
  });

  $('dm-add-profile')?.addEventListener('click', () => {
    profileStore = addProfile(profileStore);
    syncProviderForm();
    renderProfileSelect();
    setStatus('new profile');
  });

  $('dm-delete-profile')?.addEventListener('click', () => {
    const active = getActiveProfile(profileStore);
    profileStore = deleteProfile(profileStore, active.id);
    syncProviderForm();
    renderProfileSelect();
    setStatus('profile deleted');
  });

  $('dm-profile-select')?.addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    if (!id) return;
    profileStore = { ...profileStore, activeId: id };
    syncProviderForm();
    prefs = profileToPrefs(getActiveProfile(profileStore));
    syncGlassesHeader('idle');
    syncLensPreview();
    setStatus(`profile: ${getActiveProfile(profileStore).name}`);
  });

}

function openRenameSheet(): void {
  const sheet = $('dm-rename-sheet');
  const input = $('dm-rename-input') as HTMLInputElement | null;
  if (!sheet || !input) return;
  const active = getActiveSession(sessionStore);
  input.value = sessionDisplayTitle(active, sessionStore.sessions);
  sheet.hidden = false;
  requestAnimationFrame(() => {
    input.focus();
    input.select();
  });
}

function closeRenameSheet(): void {
  const sheet = $('dm-rename-sheet');
  if (sheet) sheet.hidden = true;
}

function applyRenameFromSheet(): void {
  const input = $('dm-rename-input') as HTMLInputElement | null;
  if (!input) return;
  const active = getActiveSession(sessionStore);
  const next = input.value;
  sessionStore = renameSession(sessionStore, active.id, next);
  renderSessionSelect();
  void saveSessions(bridge, sessionStore);
  closeRenameSheet();
  setStatus(next.trim() ? 'chat renamed' : 'auto title restored');
}

function wireRenameSheet(): void {
  $('dm-rename-session')?.addEventListener('click', () => openRenameSheet());
  $('dm-rename-cancel')?.addEventListener('click', () => closeRenameSheet());
  $('dm-rename-backdrop')?.addEventListener('click', () => closeRenameSheet());
  $('dm-rename-save')?.addEventListener('click', () => applyRenameFromSheet());
  $('dm-rename-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyRenameFromSheet();
    }
    if (e.key === 'Escape') closeRenameSheet();
  });
}

function wireSessions(): void {
  $('dm-new-session')?.addEventListener('click', () => newChat());
  $('dm-delete-session')?.addEventListener('click', () => deleteCurrentChat());

  $('dm-session-select')?.addEventListener('change', (e) => {
    const id = (e.target as HTMLSelectElement).value;
    if (!id || id === sessionStore.activeId) return;
    sessionStore = switchSession(sessionStore, id);
    messages = getActiveSession(sessionStore).messages;
    renderMessages();
    setGlassesIdleHint();
    setStatus('switched chat');
  });
}

function wireAdvanced(): void {
  $('dm-tools-toggle')?.addEventListener('change', (e) => {
    toolsEnabled = (e.target as HTMLInputElement).checked;
    setStatus(toolsEnabled ? 'tools on' : 'tools off');
  });

  $('dm-theme')?.addEventListener('change', (e) => {
    const theme = (e.target as HTMLSelectElement).value as ThemeId;
    applyTheme(theme);
    void saveTheme(bridge, theme);
  });

  $('dm-tether-mode')?.addEventListener('change', (e) => {
    tetherMode = (e.target as HTMLSelectElement).value as 'standalone' | 'tether';
    const banner = $('dm-tether-banner');
    if (banner) banner.hidden = tetherMode !== 'tether';
    void (async () => {
      const ts = await loadTetherSettings(bridge);
      ts.mode = tetherMode;
      await saveTetherSettings(bridge, ts);
      if (tetherMode === 'tether') {
        try {
          const healthUrl = ts.hostUrl.replace(/\/$/, '') + '/health';
          const h = await fetch(healthUrl);
          const j = (await h.json()) as { ok?: boolean; mode?: string };
          setStatus(j.ok ? `tether: ${j.mode ?? 'connected'}` : 'tether: bridge unreachable', !j.ok);
        } catch {
          setStatus('tether: bridge unreachable — run npm run tether:bridge', true);
        }
      } else {
        setStatus('mode: standalone');
      }
    })();
  });

  $('dm-tether-host')?.addEventListener('change', (e) => {
    void (async () => {
      const ts = await loadTetherSettings(bridge);
      ts.hostUrl = (e.target as HTMLInputElement).value.trim() || ts.hostUrl;
      await saveTetherSettings(bridge, ts);
    })();
  });
}

function wireChatUi(): void {
  const input = $('dm-input') as HTMLTextAreaElement | null;

  $('dm-attach-btn')?.addEventListener('click', () => openAttachSheet());

  $('dm-msg-filter')?.addEventListener('input', (e) => {
    messageFilter = (e.target as HTMLInputElement).value;
    renderMessages();
  });

  $('dm-send')?.addEventListener('click', () => {
    const t = input?.value ?? '';
    if (input) input.value = '';
    void sendChat(t);
  });

  $('dm-stop')?.addEventListener('click', () => {
    abortCtrl?.abort();
    setStreamingUi(false);
    setStatus('stopped');
  });

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      const t = input.value;
      input.value = '';
      void sendChat(t);
    }
  });

  $('dm-hub-exit')?.addEventListener('click', () => {
    requestHubExitWithConfirmation(bridge);
  });
}

export async function initDeimosPage(opts: InitOpts): Promise<void> {
  bridge = opts.bridge;
  profileStore = await loadProfiles(bridge);
  sessionStore = await loadSessions(bridge);
  messages = getActiveSession(sessionStore).messages;
  prefs = profileToPrefs(getActiveProfile(profileStore));

  const theme = await loadTheme(bridge);
  applyTheme(theme);
  const themeEl = $('dm-theme') as HTMLSelectElement | null;
  if (themeEl) themeEl.value = theme;

  const tether = await loadTetherSettings(bridge);
  tetherMode = tether.mode;
  const modeEl = $('dm-tether-mode') as HTMLSelectElement | null;
  const hostEl = $('dm-tether-host') as HTMLInputElement | null;
  if (modeEl) modeEl.value = tether.mode;
  if (hostEl) hostEl.value = tether.hostUrl;

  syncProviderForm();
  renderMessages();
  renderSessionSelect();
  renderProfileSelect();
  showChatPanel();
  wireProviderUi();
  wireSettingsSheet();
  await initMcpUi(bridge);
  const lensSettings = await loadLensSettings(bridge);
  setLensUpgradeThrottleMs(getLensUpgradeThrottleMs(lensSettings));
  const paceEl = $('dm-lens-pace') as HTMLSelectElement | null;
  if (paceEl) paceEl.value = String(lensSettings.paceMs);
  initGlassesWidgetsStub();
  wireSessions();
  wireRenameSheet();
  wireAskUserSheet();
  wireImportSheet();
  wireAttachSheet(() => {
    setStatus(hasPendingAttach() ? 'context attached' : 'attach cleared');
  });
  setImportHandler((raw) => {
    const imported = importStoreJson(raw);
    if (!imported) {
      setStatus('invalid backup JSON', true);
      return;
    }
    sessionStore = imported;
    messages = getActiveSession(sessionStore).messages;
    renderSessionSelect();
    renderMessages();
    void saveSessions(bridge, sessionStore);
    setStatus('sessions imported');
  });
  setSkillsBridge(bridge);
  wireHelpSheet();
  wireSkillsSheet();
  setSkillPickHandler((id, body) => {
    skillSystemSuffix = body;
    setStatus(`skill: ${id} — send a message to apply`);
  });
  wireLensPreview();
  setLensPreviewHandlers({
    onNavAction: (action) => {
      if (action === '< Exit') {
        requestHubExitWithConfirmation(bridge);
        return;
      }
      if (action === 'New') newChat();
      if (action === 'Provider') openSettings();
      if (action === 'Clear') {
        setGlassesIdleHint();
        setStatus('lens cleared');
      }
      if (action === 'Tools') cycleToolStatusOnGlasses();
      if (action === 'Send') {
        const input = $('dm-input') as HTMLTextAreaElement | null;
        const t = input?.value ?? '';
        if (t.trim()) {
          if (input) input.value = '';
          void sendChat(t);
        } else setStatus('type on phone first');
      }
    },
    onExitLens: () => {
      requestHubExitWithConfirmation(bridge);
    },
  });
  wireChatUi();
  wireSlashMenu();
  wireAdvanced();
  wireScrollableSelects($('dm-settings-sheet') ?? document);

  setDeimosBridgeCallbacks({
    onGlassesLensUpdate: syncLensPreview,
    onListAction: (action) => {
      if (action === 'New') newChat();
      if (action === 'Provider') openSettings();
      if (action === 'Clear') {
        setGlassesIdleHint();
        setStatus('lens cleared');
      }
    },
    onRequestSendFromGlasses: () => {
      const input = $('dm-input') as HTMLTextAreaElement | null;
      const t = input?.value ?? '';
      if (t.trim()) {
        if (input) input.value = '';
        void sendChat(t);
      } else setStatus('type on phone first');
    },
  });

  if (bridge) {
    setGlassesPrimaryMode(true);
    const res = await runDeimosOnBridge(bridge);
    if (!res.ok) setStatus(res.error, true);
    else {
      syncGlassesHeader('idle');
      setGlassesIdleHint();
      syncLensPreview();
      setStatus('G2 linked — use lens menu or phone');
    }
  } else {
    setGlassesPrimaryMode(false);
    const reason =
      opts.bridgeAbsentReason === 'browser'
        ? 'browser preview (?pc=1)'
        : opts.bridgeAbsentReason === 'timeout'
          ? 'bridge timeout'
          : 'no bridge';
    setStatus(reason);
    syncGlassesHeader('idle');
  }

  if (!prefsReadyFromProfile(getActiveProfile(profileStore))) {
    openSettings();
    setStatus('configure provider + API key', true);
  }
}

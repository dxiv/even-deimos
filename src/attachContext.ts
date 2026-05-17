let pendingAttach = '';

export function getPendingAttach(): string {
  return pendingAttach;
}

export function clearPendingAttach(): void {
  pendingAttach = '';
}

export function hasPendingAttach(): boolean {
  return pendingAttach.length > 0;
}

export function openAttachSheet(): void {
  const sheet = document.getElementById('dm-attach-sheet');
  const input = document.getElementById('dm-attach-input') as HTMLTextAreaElement | null;
  if (!sheet || !input) return;
  input.value = pendingAttach;
  sheet.hidden = false;
  requestAnimationFrame(() => input.focus());
}

function closeAttachSheet(): void {
  const sheet = document.getElementById('dm-attach-sheet');
  if (sheet) sheet.hidden = true;
}

export function wireAttachSheet(onSaved?: () => void): void {
  document.getElementById('dm-attach-paste')?.addEventListener('click', () => {
    void (async () => {
      const input = document.getElementById('dm-attach-input') as HTMLTextAreaElement | null;
      if (!input) return;
      try {
        const clip = await navigator.clipboard.readText();
        if (clip) input.value = clip;
      } catch {
        /* clipboard denied */
      }
    })();
  });

  document.getElementById('dm-attach-save')?.addEventListener('click', () => {
    const input = document.getElementById('dm-attach-input') as HTMLTextAreaElement | null;
    pendingAttach = input?.value.trim() ?? '';
    closeAttachSheet();
    onSaved?.();
  });

  document.getElementById('dm-attach-cancel')?.addEventListener('click', () => {
    pendingAttach = '';
    closeAttachSheet();
    onSaved?.();
  });

  document.getElementById('dm-attach-backdrop')?.addEventListener('click', () => closeAttachSheet());
}

export function mergeAttachIntoMessage(text: string): string {
  const body = text.trim();
  if (!pendingAttach) return body;
  const block = pendingAttach;
  pendingAttach = '';
  return `[Attached context]\n${block}\n\n[Message]\n${body}`;
}

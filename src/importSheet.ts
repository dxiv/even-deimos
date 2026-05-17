let onImport: ((json: string) => void) | null = null;

export function setImportHandler(handler: ((json: string) => void) | null): void {
  onImport = handler;
}

export function openImportSheet(): void {
  const sheet = document.getElementById('dm-import-sheet');
  const input = document.getElementById('dm-import-input') as HTMLTextAreaElement | null;
  if (!sheet || !input) return;
  input.value = '';
  sheet.hidden = false;
  requestAnimationFrame(() => input.focus());
}

function closeImportSheet(): void {
  const sheet = document.getElementById('dm-import-sheet');
  if (sheet) sheet.hidden = true;
}

export function wireImportSheet(): void {
  const submit = () => {
    const input = document.getElementById('dm-import-input') as HTMLTextAreaElement | null;
    const raw = input?.value.trim() ?? '';
    closeImportSheet();
    if (raw) onImport?.(raw);
  };

  document.getElementById('dm-import-submit')?.addEventListener('click', () => submit());
  document.getElementById('dm-import-cancel')?.addEventListener('click', () => closeImportSheet());
  document.getElementById('dm-import-backdrop')?.addEventListener('click', () => closeImportSheet());
}

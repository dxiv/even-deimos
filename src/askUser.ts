let pending: { resolve: (s: string) => void } | null = null;

export function askUserViaSheet(question: string): Promise<string> {
  return new Promise((resolve) => {
    pending = { resolve };
    const sheet = document.getElementById('dm-ask-sheet');
    const label = document.getElementById('dm-ask-question');
    const input = document.getElementById('dm-ask-input') as HTMLTextAreaElement | null;
    if (!sheet || !label || !input) {
      resolve('');
      pending = null;
      return;
    }
    label.textContent = question;
    input.value = '';
    sheet.hidden = false;
    requestAnimationFrame(() => {
      input.focus();
    });
  });
}

export function wireAskUserSheet(): void {
  const close = () => {
    const sheet = document.getElementById('dm-ask-sheet');
    if (sheet) sheet.hidden = true;
  };

  const submit = () => {
    const input = document.getElementById('dm-ask-input') as HTMLTextAreaElement | null;
    const answer = input?.value.trim() ?? '';
    close();
    pending?.resolve(answer);
    pending = null;
  };

  const cancel = () => {
    close();
    pending?.resolve('');
    pending = null;
  };

  document.getElementById('dm-ask-submit')?.addEventListener('click', () => submit());
  document.getElementById('dm-ask-cancel')?.addEventListener('click', () => cancel());
  document.getElementById('dm-ask-backdrop')?.addEventListener('click', () => cancel());
}

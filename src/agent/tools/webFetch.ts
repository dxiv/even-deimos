const MAX_CHARS = 8000;

export async function webFetch(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: { Accept: 'text/html,text/plain,*/*' },
  });
  if (!res.ok) throw new Error(`fetch ${res.status}`);
  const html = await res.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.slice(0, MAX_CHARS);
}

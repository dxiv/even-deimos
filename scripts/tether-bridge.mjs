#!/usr/bin/env node
/**
 * Minimal Deimos tether bridge for Hub development.
 * POST /v1/chat { messages } -> NDJSON StreamEvent lines.
 *
 * For full tool/bash parity, run dxa-deimos gRPC and extend this bridge to proxy it.
 */
import http from 'node:http';

const PORT = Number(process.env.DEIMOS_TETHER_PORT ?? 8765);
const OPENAI_KEY = process.env.OPENAI_API_KEY ?? '';

const server = http.createServer(async (req, res) => {
  if (req.method === 'GET' && (req.url === '/health' || req.url === '/v1/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        ok: true,
        mode: 'openai-proxy',
        grpc: 'planned — run dxa-deimos gRPC and proxy AgentService.Chat here',
      }),
    );
    return;
  }

  if (req.method === 'POST' && req.url === '/v1/chat') {
    let body = '';
    for await (const chunk of req) body += chunk;
    const { messages } = JSON.parse(body || '{}');
    res.writeHead(200, { 'Content-Type': 'application/x-ndjson' });
    if (!OPENAI_KEY) {
      res.end(JSON.stringify({ type: 'error', message: 'Set OPENAI_API_KEY for tether bridge' }) + '\n');
      return;
    }
    try {
      const apiRes = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${OPENAI_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          stream: true,
          messages: messages ?? [],
        }),
      });
      const reader = apiRes.body.getReader();
      const dec = new TextDecoder();
      let buf = '';
      let full = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const lines = buf.split('\n');
        buf = lines.pop() ?? '';
        for (const line of lines) {
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim();
          if (d === '[DONE]') continue;
          try {
            const p = JSON.parse(d);
            const t = p.choices?.[0]?.delta?.content;
            if (t) {
              full += t;
              res.write(JSON.stringify({ type: 'text_chunk', text: t }) + '\n');
            }
          } catch {
            /* skip */
          }
        }
      }
      res.write(JSON.stringify({ type: 'done', fullText: full }) + '\n');
    } catch (e) {
      res.write(JSON.stringify({ type: 'error', message: String(e) }) + '\n');
    }
    res.end();
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Deimos tether bridge http://127.0.0.1:${PORT}/v1/chat`);
});

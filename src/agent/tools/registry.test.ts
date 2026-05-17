import { describe, expect, it } from 'vitest';
import { executeTool, listToolDefinitions, registerTool } from './registry';

describe('tool registry', () => {
  it('includes built-in web_fetch and ask_user', () => {
    const names = listToolDefinitions().map((t) => t.name);
    expect(names).toContain('web_fetch');
    expect(names).toContain('ask_user');
  });

  it('runs custom registered tool', async () => {
    registerTool(
      {
        name: 'test_echo',
        description: 'echo',
        parameters: { type: 'object', properties: { x: { type: 'string' } } },
      },
      async (args) => String(args.x),
    );
    const { output, isError } = await executeTool(
      { id: '1', name: 'test_echo', arguments: { x: 'hi' } },
      { signal: new AbortController().signal },
    );
    expect(isError).toBe(false);
    expect(output).toBe('hi');
  });
});

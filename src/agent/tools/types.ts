/** JSON-schema-shaped tool definition for provider APIs. */
export type ToolDefinition = {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, { type: string; description?: string }>;
    required?: string[];
  };
};

export type ToolCallRequest = {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
};

export type ToolContext = {
  signal: AbortSignal;
  onAskUser?: (question: string) => Promise<string>;
};

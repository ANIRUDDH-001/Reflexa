import { Type, Schema, FunctionDeclaration } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import pino from 'pino';

const logger = pino();

let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

export async function initMcpClient(): Promise<Client> {
  if (mcpClient) return mcpClient;

  logger.info('Initializing Phoenix MCP Client...');
  transport = new StdioClientTransport({
    command: 'npx',
    // In production we should use specific versions or installed binary
    args: ['-y', '@arizeai/phoenix-mcp'],
  });

  mcpClient = new Client({ name: 'reflexa-agent', version: '1.0.0' }, { capabilities: {} });

  try {
    await mcpClient.connect(transport);
    logger.info('Phoenix MCP Client connected.');
    return mcpClient;
  } catch (e) {
    logger.error({ err: e }, 'Failed to connect to Phoenix MCP Client');
    mcpClient = null;
    transport = null;
    throw e;
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mcpSchemaToGeminiSchema(jsonSchema: any): Schema {
  const schema: Schema = {
    type: Type.OBJECT,
    properties: {},
    required: jsonSchema.required || [],
  };

  if (jsonSchema.properties) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const [key, val] of Object.entries<any>(jsonSchema.properties)) {
      let t = Type.STRING;
      switch (val.type) {
        case 'string':
          t = Type.STRING;
          break;
        case 'integer':
          t = Type.INTEGER;
          break;
        case 'number':
          t = Type.NUMBER;
          break;
        case 'boolean':
          t = Type.BOOLEAN;
          break;
        case 'array':
          t = Type.ARRAY;
          break;
        case 'object':
          t = Type.OBJECT;
          break;
      }

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      schema.properties![key] = {
        type: t,
        description: val.description,
      };
    }
  }

  return schema;
}

export async function getMcpToolsAsGemini(): Promise<FunctionDeclaration[]> {
  const client = await initMcpClient();
  const toolsRes = await client.listTools();

  return toolsRes.tools.map((tool) => ({
    name: tool.name,
    description: tool.description || '',
    parameters: mcpSchemaToGeminiSchema(tool.inputSchema),
  }));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callMcpTool(name: string, args: Record<string, any>) {
  const client = await initMcpClient();
  const result = await client.callTool({
    name,
    arguments: args,
  });

  if (result.isError) {
    throw new Error(`Tool ${name} failed: ${JSON.stringify(result.content)}`);
  }

  const contentArray = result.content as Array<{ type: string; text?: string }>;
  // Return a combined string of text content
  return contentArray
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');
}

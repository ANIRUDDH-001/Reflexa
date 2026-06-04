import { Type, Schema, FunctionDeclaration } from '@google/genai';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import pino from 'pino';

const logger = pino();

let mcpClient: Client | null = null;
let transport: StdioClientTransport | null = null;

export async function initMcpClient(): Promise<Client> {
  if (process.env.PHOENIX_MCP_ENABLED === 'false') {
    throw new Error('[mcp] Phoenix MCP is disabled via PHOENIX_MCP_ENABLED=false');
  }
  logger.info('Initializing Phoenix MCP Client...');

  transport = new StdioClientTransport({
    command: process.platform === 'win32' ? 'npx.cmd' : 'npx',
    args: ['--yes', '@arizeai/phoenix-mcp'],
    env: {
      ...process.env,
      PHOENIX_API_KEY: process.env.PHOENIX_API_KEY || '',
      PHOENIX_COLLECTOR_ENDPOINT: process.env.PHOENIX_COLLECTOR_ENDPOINT || '',
    } as Record<string, string>,
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

/**
 * Gracefully shuts down the MCP client and kills the subprocess.
 * Call this before process exit to prevent zombie processes.
 * Shutdown order: close client → close transport → null both.
 */
export async function shutdownMcpClient(): Promise<void> {
  if (mcpClient) {
    try {
      await mcpClient.close();
    } catch (err) {
      logger.error({ err }, '[mcp] Error closing MCP client during shutdown:');
    }
    mcpClient = null;
  }
  if (transport) {
    try {
      await transport.close();
    } catch (err) {
      logger.error({ err }, '[mcp] Error closing MCP transport during shutdown:');
    }
    transport = null;
  }
  logger.info('[mcp] MCP client shut down');
}

let _initPromise: Promise<Client> | null = null;

export async function getOrInitMcpClient(): Promise<Client> {
  if (mcpClient) {
    try {
      await mcpClient.listTools(); // health check ping
      return mcpClient;
    } catch {
      // Client is stale — dispose and recreate
      try {
        await mcpClient.close();
      } catch {
        /* ignore close errors */
      }
      mcpClient = null;
      transport = null;
      _initPromise = null;
    }
  }

  // Promise-based lock prevents concurrent init race condition
  if (!_initPromise) {
    _initPromise = initMcpClient().catch((err) => {
      _initPromise = null;
      throw new Error(
        `Phoenix MCP server is unavailable. Ensure @arizeai/phoenix-mcp is installed and PHOENIX_API_KEY is set. Original error: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    });
  }

  return _initPromise;
}

function mcpSchemaToGeminiSchema(jsonSchema: Record<string, unknown>): Schema {
  const type = jsonSchema['type'] as string | undefined;

  if (type === 'object') {
    const properties = jsonSchema['properties'] as Record<string, unknown> | undefined;
    const required = jsonSchema['required'] as string[] | undefined;
    const geminiProperties: Record<string, Schema> = {};

    if (properties) {
      for (const [key, val] of Object.entries(properties)) {
        geminiProperties[key] = mcpSchemaToGeminiSchema(val as Record<string, unknown>);
      }
    }

    return {
      type: Type.OBJECT,
      description: jsonSchema['description'] as string | undefined,
      properties: geminiProperties,
      required: required ?? [],
    };
  }

  if (type === 'array') {
    const items = jsonSchema['items'] as Record<string, unknown> | undefined;
    return {
      type: Type.ARRAY,
      description: jsonSchema['description'] as string | undefined,
      items: items ? mcpSchemaToGeminiSchema(items) : { type: Type.STRING },
    };
  }

  const primitiveMap: Record<string, Type> = {
    string: Type.STRING,
    integer: Type.INTEGER,
    number: Type.NUMBER,
    boolean: Type.BOOLEAN,
  };

  return {
    type: primitiveMap[type ?? 'string'] ?? Type.STRING,
    description: jsonSchema['description'] as string | undefined,
    enum: jsonSchema['enum'] as string[] | undefined,
  };
}

export async function getMcpToolsAsGemini(): Promise<FunctionDeclaration[]> {
  const client = await getOrInitMcpClient();
  const toolsRes = await client.listTools();

  return toolsRes.tools.map((tool) => ({
    name: tool.name,
    description: tool.description || '',
    parameters: mcpSchemaToGeminiSchema(tool.inputSchema as Record<string, unknown>),
  }));
}

export async function callMcpTool(
  toolName: string,
  args: Record<string, unknown>,
): Promise<string> {
  const client = await getOrInitMcpClient();
  const result = await client.callTool({ name: toolName, arguments: args });

  if (result.isError) {
    throw new Error(`Tool ${toolName} failed: ${JSON.stringify(result.content)}`);
  }

  const contentArray = result.content as Array<{ type: string; text?: string }>;
  if (!contentArray || contentArray.length === 0) {
    return '[No data returned from tool]';
  }

  return contentArray
    .filter((c) => c.type === 'text' && c.text)
    .map((c) => c.text)
    .join('\n');
}

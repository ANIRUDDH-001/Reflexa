import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const transport = new StdioClientTransport({
  command: 'node',
  args: ['packages/backend/node_modules/@arizeai/phoenix-mcp/dist/index.js'],
});

const client = new Client({
  name: 'reflexa',
  version: '1.0.0',
}, {
  capabilities: {
    tools: {},
  },
});

async function run() {
  console.log('Connecting...');
  await client.connect(transport);
  console.log('Connected');
  
  const toolsResponse = await client.listTools();
  console.log('Available tools:');
  console.log(JSON.stringify(toolsResponse, null, 2));
  
  await client.close();
  process.exit(0);
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});

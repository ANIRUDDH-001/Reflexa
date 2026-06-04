import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { register } from '@arizeai/phoenix-otel';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { shutdownMcpClient } from './engine/mcp';

const projectName =
  process.env.PHOENIX_PROJECT_NAME || process.env.OPENINFERENCE_PROJECT_NAME || 'default';
const hasApiKey = !!process.env.PHOENIX_API_KEY;

// eslint-disable-next-line no-console
console.log(`[Phoenix] Project: ${projectName} | API Key: ${hasApiKey ? 'set' : 'MISSING'}`);

const provider = register({
  projectName,
});

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new MCPInstrumentation(),
  ],
});

// eslint-disable-next-line no-console
console.log('[Phoenix] OpenTelemetry SDK started successfully with phoenix-otel');

process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  if (provider && provider.forceFlush) {
    // eslint-disable-next-line no-console
    await provider.forceFlush().catch(console.error);
  }
  process.exit(0);
});

process.on('SIGINT', async () => {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  if (provider && provider.forceFlush) {
    // eslint-disable-next-line no-console
    await provider.forceFlush().catch(console.error);
  }
  process.exit(0);
});

import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { register } from '@arizeai/phoenix-otel';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { shutdownMcpClient } from './engine/mcp';

const PHOENIX_PROJECT = process.env.PHOENIX_PROJECT_NAME || 'reflexa';
const hasApiKey = !!process.env.PHOENIX_API_KEY;

// eslint-disable-next-line no-console
console.log(`[Phoenix] Project: ${PHOENIX_PROJECT} | API Key: ${hasApiKey ? 'set' : 'MISSING'}`);

const provider = register({
  projectName: PHOENIX_PROJECT,
  url: process.env.PHOENIX_COLLECTOR_ENDPOINT,
  headers: {
    api_key: process.env.PHOENIX_API_KEY || '',
  },
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

export async function shutdownTelemetry(): Promise<void> {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  if (provider && provider.forceFlush) {
    // eslint-disable-next-line no-console
    await provider.forceFlush().catch(console.error);
  }
}

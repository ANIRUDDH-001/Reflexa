import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { register } from '@arizeai/phoenix-otel';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { shutdownMcpClient } from './engine/mcp';

const ARIZE_PROJECT = process.env.ARIZE_PROJECT_NAME || 'reflexa';
const hasApiKey = !!process.env.ARIZE_API_KEY;

// eslint-disable-next-line no-console
console.log(`[Arize] Project: ${ARIZE_PROJECT} | API Key: ${hasApiKey ? 'set' : 'MISSING'}`);

const provider = register({
  projectName: ARIZE_PROJECT,
  url: 'https://otlp.arize.com/v1',
  headers: {
    space_id: process.env.ARIZE_SPACE_ID || '',
    api_key: process.env.ARIZE_API_KEY || '',
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
console.log('[Arize] OpenTelemetry SDK started successfully with phoenix-otel');

export async function shutdownTelemetry(): Promise<void> {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  if (provider && provider.forceFlush) {
    // eslint-disable-next-line no-console
    await provider.forceFlush().catch(console.error);
  }
}

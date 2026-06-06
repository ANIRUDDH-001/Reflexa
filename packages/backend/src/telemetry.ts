import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { shutdownMcpClient } from './engine/mcp';

const ARIZE_PROJECT =
  process.env.ARIZE_PROJECT_NAME || process.env.PHOENIX_PROJECT_NAME || 'reflexa';
const API_KEY =
  process.env.ARIZE_API_KEY ||
  'ak-75620c3c-10a6-414b-931e-1c1f2c4c1ac8-tGlxasthdGjlN8pFQMnM9PsEP7NxFCLj'; // HOTFIX: Hardcoded to user's Arize AX key
const SPACE_ID = process.env.ARIZE_SPACE_ID || 'U3BhY2U6NDU2NzU6VWQxVQ=='; // HOTFIX: Hardcoded to user's Space ID
const hasApiKey = !!API_KEY;

// eslint-disable-next-line no-console
console.log(`[Arize] Project: ${ARIZE_PROJECT} | API Key: ${hasApiKey ? 'set' : 'MISSING'}`);

const provider = new NodeTracerProvider({
  resource: resourceFromAttributes({
    [ATTR_SERVICE_NAME]: ARIZE_PROJECT,
    [SEMRESATTRS_PROJECT_NAME]: ARIZE_PROJECT,
  }),
  spanProcessors: [
    new SimpleSpanProcessor(
      new OTLPTraceExporter({
        url: 'https://otlp.arize.com/v1/traces',
        headers: {
          space_id: SPACE_ID,
          Authorization: `Bearer ${API_KEY}`,
        },
      }),
    ),
  ],
});

provider.register();

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
    new MCPInstrumentation(),
  ],
});

// eslint-disable-next-line no-console
console.log('[Arize] OpenTelemetry SDK started successfully with standard OTLP trace exporter');

export async function shutdownTelemetry(): Promise<void> {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  if (provider && provider.forceFlush) {
    // eslint-disable-next-line no-console
    await provider.forceFlush().catch(console.error);
  }
}

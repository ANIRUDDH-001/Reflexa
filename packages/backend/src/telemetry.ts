import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { shutdownMcpClient } from './engine/mcp';

// Sanitize Phoenix Cloud endpoint
let collectorUrl = process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces';
if (collectorUrl.includes('app.phoenix.arize.com') && !collectorUrl.endsWith('/v1/traces')) {
  // If the user provided a UI URL like /s/project-name, append the OTLP ingest path
  collectorUrl = collectorUrl.replace(/\/+$/, '') + '/v1/traces';
}

const projectName =
  process.env.PHOENIX_PROJECT_NAME || process.env.OPENINFERENCE_PROJECT_NAME || 'default';
const hasApiKey = !!process.env.PHOENIX_API_KEY;

// eslint-disable-next-line no-console
console.log(`[Phoenix] Exporting traces to: ${collectorUrl}`);
// eslint-disable-next-line no-console
console.log(`[Phoenix] Project: ${projectName} | API Key: ${hasApiKey ? 'set' : 'MISSING'}`);

const traceExporter = new OTLPTraceExporter({
  url: collectorUrl,
  headers: {
    api_key: process.env.PHOENIX_API_KEY || '',
  },
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: projectName,
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  }),
  traceExporter,
  // BatchSpanProcessor queues spans and exports in batches — more reliable than
  // SimpleSpanProcessor which can drop spans under load or on export failure.
  spanProcessor: new BatchSpanProcessor(traceExporter, {
    maxQueueSize: 2048,
    maxExportBatchSize: 512,
    scheduledDelayMillis: 5000,
  }),
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start();
// eslint-disable-next-line no-console
console.log('[Phoenix] OpenTelemetry SDK started successfully');

// Register OpenInference MCP instrumentation separately after SDK starts.
// This instruments all @modelcontextprotocol/sdk client calls automatically.
registerInstrumentations({
  instrumentations: [new MCPInstrumentation()],
});

process.on('SIGTERM', async () => {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  // eslint-disable-next-line no-console
  await sdk.shutdown().catch(console.error);
  process.exit(0);
});

process.on('SIGINT', async () => {
  // eslint-disable-next-line no-console
  await shutdownMcpClient().catch(console.error);
  // eslint-disable-next-line no-console
  await sdk.shutdown().catch(console.error);
  process.exit(0);
});

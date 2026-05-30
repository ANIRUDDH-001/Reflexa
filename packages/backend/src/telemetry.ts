import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { shutdownMcpClient } from './engine/mcp';

// Sanitize Phoenix Cloud endpoint
let collectorUrl = process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces';
if (collectorUrl.includes('app.phoenix.arize.com') && !collectorUrl.endsWith('/v1/traces')) {
  // If the user provided a UI URL like /s/project-name, append the OTLP ingest path
  collectorUrl = collectorUrl.replace(/\/+$/, '') + '/v1/traces';
}

const traceExporter = new OTLPTraceExporter({
  url: collectorUrl,
  headers: {
    api_key: process.env.PHOENIX_API_KEY || '',
  },
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'reflexa-backend',
    [SemanticResourceAttributes.SERVICE_VERSION]: '0.1.0',
  }),
  traceExporter,
  spanProcessor: new SimpleSpanProcessor(traceExporter),
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start();

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

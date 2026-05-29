import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

// Phoenix Cloud requires the api_key header on every OTLP request.
// PHOENIX_COLLECTOR_ENDPOINT must point to https://app.phoenix.arize.com/v1/traces
// PHOENIX_API_KEY is your Phoenix Cloud API key from app.phoenix.arize.com > Settings
const traceExporter = new OTLPTraceExporter({
  url: process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces',
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
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start();

// Register OpenInference MCP instrumentation separately after SDK starts.
// This instruments all @modelcontextprotocol/sdk client calls automatically.
registerInstrumentations({
  instrumentations: [new MCPInstrumentation()],
});

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  sdk.shutdown().catch(console.error);
});

process.on('SIGINT', () => {
  // eslint-disable-next-line no-console
  sdk.shutdown().catch(console.error);
});

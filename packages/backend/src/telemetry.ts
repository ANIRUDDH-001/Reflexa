import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const traceExporter = new OTLPTraceExporter({
  url: process.env.PHOENIX_COLLECTOR_ENDPOINT || 'http://localhost:6006/v1/traces',
});

const sdk = new NodeSDK({
  resource: resourceFromAttributes({
    [SemanticResourceAttributes.SERVICE_NAME]: 'reflexa-backend',
  }),
  traceExporter,
  instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
});

sdk.start();

process.on('SIGTERM', () => {
  // eslint-disable-next-line no-console
  sdk
    .shutdown()
    .then(() => console.log('Tracing terminated'))
    .catch(console.error);
});

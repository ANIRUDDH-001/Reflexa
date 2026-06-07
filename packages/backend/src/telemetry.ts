import { MCPInstrumentation } from '@arizeai/openinference-instrumentation-mcp';
import { SEMRESATTRS_PROJECT_NAME } from '@arizeai/openinference-semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { registerInstrumentations } from '@opentelemetry/instrumentation';
// Express and HTTP instrumentations removed to prevent Cloud Run orphan span issues
import { resourceFromAttributes } from '@opentelemetry/resources';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { shutdownMcpClient } from './engine/mcp';

const DEFAULT_ARIZE_PROJECT_NAME = 'reflexa-backend';
const DEFAULT_ARIZE_COLLECTOR_ENDPOINT = 'https://otlp.arize.com/v1/traces';

let provider: NodeTracerProvider | null = null;
let telemetryEnabled = false;
let telemetryInitialized = false;

function getArizeProjectName(): string {
  return (
    process.env.ARIZE_PROJECT_NAME?.trim() ||
    process.env.PHOENIX_PROJECT_NAME?.trim() ||
    DEFAULT_ARIZE_PROJECT_NAME
  ).toLowerCase();
}

function getCollectorEndpoint(): string {
  return (
    process.env.ARIZE_COLLECTOR_ENDPOINT?.trim() ||
    process.env.PHOENIX_COLLECTOR_ENDPOINT?.trim() ||
    DEFAULT_ARIZE_COLLECTOR_ENDPOINT
  );
}

export function initializeTelemetry(): void {
  if (telemetryInitialized) {
    return;
  }
  telemetryInitialized = true;

  const apiKey = process.env.ARIZE_API_KEY?.trim() || process.env.PHOENIX_API_KEY?.trim();
  const spaceId = process.env.ARIZE_SPACE_ID?.trim();
  const projectName = getArizeProjectName();

  if (!apiKey || !spaceId) {
    // eslint-disable-next-line no-console
    console.warn(
      '[Arize] Tracing disabled. Set ARIZE_API_KEY and ARIZE_SPACE_ID to enable export.',
    );
    return;
  }

  provider = new NodeTracerProvider({
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: projectName,
      [SEMRESATTRS_PROJECT_NAME]: projectName,
    }),
    spanProcessors: [
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: getCollectorEndpoint(),
          headers: {
            space_id: spaceId,
            Authorization: `Bearer ${apiKey}`,
          },
        }),
      ),
    ],
  });

  provider.register();

  registerInstrumentations({
    tracerProvider: provider,
    instrumentations: [new MCPInstrumentation()],
  });

  telemetryEnabled = true;

  // eslint-disable-next-line no-console
  console.log(`[Arize] Telemetry initialized for project "${projectName}"`);
}

export async function shutdownTelemetry(): Promise<void> {
  await shutdownMcpClient().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  });

  if (!telemetryEnabled || !provider) {
    return;
  }

  await provider.forceFlush().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  });
  await provider.shutdown().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
  });

  provider = null;
  telemetryEnabled = false;
  telemetryInitialized = false;
}

export async function forceFlushTelemetry(): Promise<void> {
  if (telemetryEnabled && provider) {
    await provider.forceFlush().catch((err) => {
      // eslint-disable-next-line no-console
      console.error(err);
    });
  }
}

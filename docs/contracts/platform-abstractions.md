# Platform Abstractions Contract

To preserve deployment portability, the following interfaces must be implemented via adapters.

## Required Ports
- `DatabasePort`: transactional persistence and query operations.
- `ObjectStoragePort`: upload, download, signed URL generation, lifecycle operations.
- `QueuePort`: enqueue, delay, retry, dead-letter support.
- `AuthClaimsPort`: token verification and normalized identity claims.
- `EmailPort` (optional module): transactional email sending.
- `ObservabilityPort`: structured logs, metrics, trace hooks.

## Rules
- Domain and application layers depend on ports only.
- Infrastructure layer provides provider-specific adapters.
- No direct imports of provider SDKs outside infrastructure layer.
- Each adapter must include integration tests and error mapping.
- CI must include boundary checks that fail when provider SDK imports appear outside infrastructure paths.
- Source files that are not explicitly under `infrastructure` are treated as non-infrastructure and may not import provider SDKs.

## Deployment Mapping Examples
- Managed profile:
  - Supabase Postgres/Auth/Storage adapters
  - Provider-native queue adapter as selected by deployment
- Cloud-portable profile:
  - Postgres adapter (RDS/Cloud SQL/Azure PG/self-managed)
  - S3-compatible adapter (S3/GCS/Azure Blob via compatibility adapter)
  - Queue adapter (SQS/PubSub/Service Bus/Redis-backed jobs)

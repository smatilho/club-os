# Module Contracts

Every backend module must expose:
- Application service interface (commands/queries)
- Public event contracts
- Persistence boundary (repository interface)
- Authorization checks mapped to capabilities

## Contract Rules
- Contracts are semver versioned.
- Breaking changes require ADR update and migration notes.
- Events are immutable once published (new version only).
- Consumers must depend on interfaces, not concrete adapters.
- Module dependencies are declared as explicit objects (`module`, `version`, `optional`).
- Capabilities use namespaced identifiers (for example: `reservation.manage`).
- Web routes are declared for the unified `web` app and mapped to route areas (`public`, `member`, `admin`, `shared`).

## Test Requirements
- Contract tests for each public module interface.
- Consumer-driven tests for shared events.
- Tenant isolation tests for all data access methods.
- Adapter boundary tests to detect vendor SDK usage outside `infrastructure` layers.
- Unlayered source files are treated as non-infrastructure and must not import vendor SDKs.

export interface RequestContext {
  requestId: string;
  organizationId: string;
  actorId: string | null;
  capabilities: string[];
  timestamp: string;
}

export function createAnonymousContext(requestId: string): RequestContext {
  return {
    requestId,
    organizationId: "",
    actorId: null,
    capabilities: [],
    timestamp: new Date().toISOString(),
  };
}

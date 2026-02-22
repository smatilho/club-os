export interface LogEntry {
  level: "debug" | "info" | "warn" | "error";
  message: string;
  context?: Record<string, unknown>;
}

export interface SpanHandle {
  end(): void;
  setTag(key: string, value: string): void;
}

export interface ObservabilityPort {
  log(entry: LogEntry): void;
  metric(name: string, value: number, tags?: Record<string, string>): void;
  startSpan(name: string): SpanHandle;
}

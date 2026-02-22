export interface DatabasePort {
  query<T>(sql: string, params?: unknown[]): Promise<T[]>;
  execute(sql: string, params?: unknown[]): Promise<{ rowCount: number }>;
  transaction<T>(fn: (tx: DatabasePort) => Promise<T>): Promise<T>;
}

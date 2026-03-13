interface ApiRuntimeConfig {
  port: number;
  defaultOrgId: string;
  autoSeed: boolean;
}

const DEFAULT_PORT = 4000;
const DEFAULT_ORG_ID = "org-default";

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;
  throw new Error(
    `Invalid boolean value '${value}' for CLUB_OS_AUTO_SEED. Use true/false.`,
  );
}

function parsePort(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return DEFAULT_PORT;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 65535) {
    throw new Error(`Invalid PORT '${value}'. Expected integer 1-65535.`);
  }
  return parsed;
}

function parseDefaultOrgId(value: string | undefined): string {
  const result = value?.trim() || DEFAULT_ORG_ID;
  if (!/^[a-z0-9-]+$/.test(result)) {
    throw new Error(
      `Invalid CLUB_OS_DEFAULT_ORG_ID '${result}'. Use lowercase letters, numbers, and hyphens.`,
    );
  }
  return result;
}

export function getApiRuntimeConfig(
  env: Record<string, string | undefined> = process.env,
): ApiRuntimeConfig {
  return {
    port: parsePort(env.PORT),
    defaultOrgId: parseDefaultOrgId(env.CLUB_OS_DEFAULT_ORG_ID),
    autoSeed: parseBoolean(env.CLUB_OS_AUTO_SEED, true),
  };
}

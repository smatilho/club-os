import type { OrgId } from "@club-os/domain-core";
import { ok, err, type Result } from "@club-os/domain-core";

export interface ThemeSettings {
  brandName: string;
  logoUrl: string | null;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
  textColor: string;
}

const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;

export function validateThemeSettings(
  body: unknown,
): { ok: true; value: ThemeSettings } | { ok: false; error: string } {
  if (!body || typeof body !== "object") {
    return { ok: false, error: "Body must be an object" };
  }
  const candidate = body as Record<string, unknown>;

  if (
    typeof candidate.brandName !== "string" ||
    candidate.brandName.trim() === ""
  ) {
    return { ok: false, error: "brandName must be a non-empty string" };
  }

  if (
    candidate.logoUrl !== null &&
    typeof candidate.logoUrl !== "string"
  ) {
    return { ok: false, error: "logoUrl must be a string or null" };
  }

  for (const field of [
    "primaryColor",
    "accentColor",
    "surfaceColor",
    "textColor",
  ] as const) {
    if (typeof candidate[field] !== "string") {
      return { ok: false, error: `${field} must be a string` };
    }
    if (!HEX_COLOR_RE.test(candidate[field] as string)) {
      return {
        ok: false,
        error: `${field} must be a valid hex color (#RRGGBB)`,
      };
    }
  }

  return {
    ok: true,
    value: {
      brandName: candidate.brandName as string,
      logoUrl: (candidate.logoUrl as string | null) ?? null,
      primaryColor: candidate.primaryColor as string,
      accentColor: candidate.accentColor as string,
      surfaceColor: candidate.surfaceColor as string,
      textColor: candidate.textColor as string,
    },
  };
}

const DEFAULT_THEME: ThemeSettings = {
  brandName: "Club OS",
  logoUrl: null,
  primaryColor: "#1a365d",
  accentColor: "#c6a35c",
  surfaceColor: "#f7f5f0",
  textColor: "#1a1a1a",
};

export class OrgProfileService {
  private themes = new Map<string, ThemeSettings>();

  reset(): void {
    this.themes.clear();
  }

  getTheme(organizationId: OrgId): ThemeSettings {
    return this.themes.get(organizationId) ?? { ...DEFAULT_THEME };
  }

  updateTheme(
    organizationId: OrgId,
    settings: ThemeSettings,
  ): Result<ThemeSettings, string> {
    this.themes.set(organizationId, { ...settings });
    return ok(settings);
  }
}

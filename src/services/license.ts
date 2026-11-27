import type { License, PlanId } from '../models/plan';
import { getLicense, saveLicense } from './entitlements';

/**
 * License validation behind an interface, so the provider can change without touching the UI.
 *
 * Default: Lemon Squeezy license keys. Lemon Squeezy is a Merchant of Record (handles VAT and invoices,
 * pays out to an Israeli bank), and its license API is designed to be called from client apps, which
 * suits a static site with no backend: the buyer gets a key by email and pastes it on /upgrade.
 */
export interface LicenseValidator {
  validate(key: string): Promise<{ valid: boolean; plan: PlanId; validUntil: string } | { valid: false; error: string }>;
}

/** Access length of one "exam pass" purchase when the key itself has no expiry. */
const PASS_DAYS = Number(import.meta.env.VITE_PASS_DAYS ?? 90);

export class LemonSqueezyLicenseValidator implements LicenseValidator {
  async validate(key: string) {
    const res = await fetch('https://api.lemonsqueezy.com/v1/licenses/validate', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ license_key: key }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      valid?: boolean;
      error?: string;
      license_key?: { expires_at?: string | null; created_at?: string };
    };
    if (!json.valid) return { valid: false as const, error: json.error ?? 'הקוד לא תקף' };
    const created = Date.parse(json.license_key?.created_at ?? '') || Date.now();
    const validUntil = json.license_key?.expires_at ?? new Date(created + PASS_DAYS * 86_400_000).toISOString();
    return { valid: true as const, plan: 'pass' as const, validUntil };
  }
}

const KEY_FORMAT = /^[A-Za-z0-9-]{16,64}$/;

/** Validate a pasted key and store it. Returns an error message for the UI, or null on success. */
export async function activateLicense(rawKey: string, validator: LicenseValidator = new LemonSqueezyLicenseValidator()): Promise<string | null> {
  const key = rawKey.trim();
  if (!KEY_FORMAT.test(key)) return 'פורמט הקוד לא תקין';
  try {
    const result = await validator.validate(key);
    if (!result.valid) return 'error' in result ? result.error : 'הקוד לא תקף';
    const license: License = { key, plan: result.plan, validUntil: result.validUntil, checkedAt: Date.now() };
    saveLicense(license);
    return null;
  } catch {
    return 'אין חיבור לשרת האימות. נסו שוב.';
  }
}

/** Re-check the stored key in the background (once a day), so a refunded key stops working. */
export async function refreshLicense(validator: LicenseValidator = new LemonSqueezyLicenseValidator()): Promise<void> {
  const current = getLicense();
  if (!current || Date.now() - current.checkedAt < 86_400_000) return;
  try {
    const result = await validator.validate(current.key);
    if (result.valid) saveLicense({ ...current, validUntil: result.validUntil, checkedAt: Date.now() });
    else saveLicense(null);
  } catch {
    /* offline: keep the license until OFFLINE_GRACE_MS runs out */
  }
}

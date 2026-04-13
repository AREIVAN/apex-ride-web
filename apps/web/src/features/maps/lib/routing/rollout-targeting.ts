interface CanaryParams {
  baseEnabled: boolean;
  allowlist?: Iterable<string>;
  percent?: number;
  key?: string | null;
  salt?: string;
}

export function parseAllowlist(raw: string | undefined): Set<string> {
  if (!raw) {
    return new Set();
  }

  const values = raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return new Set(values);
}

export function parsePercent(raw: string | number | undefined): number | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const parsed = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(parsed)) {
    return undefined;
  }

  if (parsed < 0 || parsed > 100) {
    return undefined;
  }

  return parsed;
}

export function hashToBucket(key: string, salt = ""): number {
  const value = `${salt}:${key}`;
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 100;
}

export function isCanaryEnabled({
  baseEnabled,
  allowlist,
  percent,
  key,
  salt
}: CanaryParams): boolean {
  if (!baseEnabled) {
    return false;
  }

  const normalizedAllowlist = new Set(
    Array.from(allowlist ?? []).map((value) => value.trim()).filter((value) => value.length > 0)
  );
  const hasCanaryConfig = normalizedAllowlist.size > 0 || percent !== undefined;

  if (!hasCanaryConfig) {
    return true;
  }

  const normalizedKey = key?.trim();
  if (!normalizedKey) {
    return false;
  }

  if (normalizedAllowlist.has(normalizedKey)) {
    return true;
  }

  if (percent === undefined || percent <= 0) {
    return false;
  }

  if (percent >= 100) {
    return true;
  }

  return hashToBucket(normalizedKey, salt) < percent;
}

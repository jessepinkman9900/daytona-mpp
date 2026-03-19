/**
 * Route pattern matching for Daytona API paths.
 *
 * Supports:
 * - Exact matches: "/sandbox" matches "/sandbox"
 * - Param segments: "/sandbox/:id" matches "/sandbox/abc-123"
 * - Wildcard suffix: "/sandbox/*" matches "/sandbox/abc/start"
 */

import { FLAT_FEES, DEFAULT_FEES, type Fee } from "./rates";

/**
 * Check if a request path matches a route pattern.
 */
export function pathMatchesPattern(path: string, pattern: string): boolean {
  if (pattern.endsWith("/*")) {
    const prefixParts = pattern.slice(0, -2).split("/");
    const pathParts = path.split("/");
    if (pathParts.length < prefixParts.length) return false;
    return prefixParts.every(
      (seg, i) => seg.startsWith(":") || seg === pathParts[i],
    );
  }

  const patternParts = pattern.split("/");
  const pathParts = path.split("/");

  if (patternParts.length !== pathParts.length) return false;

  return patternParts.every(
    (seg, i) => seg.startsWith(":") || seg === pathParts[i],
  );
}

// Pre-parse FLAT_FEES keys at module load — avoid splitting strings on every request
const PARSED_FEES = Object.entries(FLAT_FEES).map(([key, fee]) => {
  const spaceIdx = key.indexOf(" ");
  return {
    method: key.slice(0, spaceIdx),
    pattern: key.slice(spaceIdx + 1),
    ...fee,
  };
});

/**
 * Find the fee for a given method + path.
 * First checks specific route patterns, then falls back to method-based defaults.
 * Returns null only for unsupported HTTP methods.
 */
export function findFee(
  method: string,
  path: string,
): Fee | null {
  const m = method.toUpperCase();

  // Try specific route match first
  const specific = PARSED_FEES.find(
    (f) => f.method === m && pathMatchesPattern(path, f.pattern),
  );
  if (specific) return specific;

  // Fall back to method-based default
  return DEFAULT_FEES[m] ?? null;
}

/**
 * Apply platform surcharge to a fee.
 * Returns a new fee with the surcharge applied to the amount.
 */
export function applySurcharge(
  fee: Fee,
  surcharge: number,
): Fee {
  if (!surcharge || surcharge <= 0) return fee;

  const base = parseFloat(fee.amount);
  const total = base * (1 + surcharge);
  return {
    ...fee,
    amount: total.toFixed(6),
    description: `${fee.description} (+${(surcharge * 100).toFixed(0)}% platform fee)`,
  };
}

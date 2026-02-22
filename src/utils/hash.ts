import { createHash } from 'crypto';

/**
 * Deterministic JSON stringify (key order) for stable hashing.
 */
function deterministicStringify(value: unknown): string {
  if (value === null) return 'null';
  if (typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) {
    return '[' + value.map(deterministicStringify).join(',') + ']';
  }
  const keys = Object.keys(value as object).sort();
  const pairs = keys.map(
    (k) => JSON.stringify(k) + ':' + deterministicStringify((value as Record<string, unknown>)[k])
  );
  return '{' + pairs.join(',') + '}';
}

/**
 * SHA256 hash of the precheck input (deterministic). Used for inputSnapshotHash on
 * ComplianceDecision and AuditLog.
 */
export function sha256InputSnapshot(input: unknown): string {
  const str = deterministicStringify(input);
  return createHash('sha256').update(str, 'utf8').digest('hex');
}

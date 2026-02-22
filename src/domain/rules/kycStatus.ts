import type { PrecheckInput, PrecheckResult } from '../policyEngine';

export function evaluateKycStatus(input: PrecheckInput): PrecheckResult {
  const status = (input.kycStatus ?? '').toLowerCase();
  if (status === 'blocked') return { allowed: false, reason: 'KYC blocked' };
  if (status === 'pending' && (input.amount ?? 0) > 1000) {
    return { allowed: false, reason: 'KYC pending; amount over limit' };
  }
  return { allowed: true };
}

import type { PrecheckInput, RuleResult } from '../types';

const RULE_NAME = 'corridor';

const HIGH_RISK_COUNTRIES = new Set(['XX', 'YY']); // placeholder; replace with real list

export function evaluateCorridor(input: PrecheckInput): RuleResult {
  const from = input.corridor.fromCountry.toUpperCase();
  const to = input.corridor.toCountry.toUpperCase();

  if (HIGH_RISK_COUNTRIES.has(from) || HIGH_RISK_COUNTRIES.has(to)) {
    return {
      ruleName: RULE_NAME,
      outcome: 'REVIEW',
      reason: `High-risk corridor: ${from} -> ${to}`,
    };
  }

  return { ruleName: RULE_NAME, outcome: 'ALLOW' };
}

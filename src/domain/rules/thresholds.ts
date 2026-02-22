import type { PrecheckInput, RuleResult } from '../types';
import { getConfig } from '../../utils/validate';

const RULE_NAME = 'thresholds';

export function evaluateThresholds(input: PrecheckInput): RuleResult {
  const config = getConfig();
  const { value, currency } = input.amount;

  if (value < 0) {
    return { ruleName: RULE_NAME, outcome: 'BLOCK', reason: 'Negative amount' };
  }

  const threshold = config.thresholdByCurrency[currency.toUpperCase()];
  if (threshold == null) {
    return { ruleName: RULE_NAME, outcome: 'ALLOW' };
  }

  if (value > threshold) {
    const action = config.thresholdAction;
    return {
      ruleName: RULE_NAME,
      outcome: action,
      reason: `Amount ${value} ${currency} exceeds threshold ${threshold}`,
    };
  }

  return { ruleName: RULE_NAME, outcome: 'ALLOW' };
}

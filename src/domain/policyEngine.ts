import type { PrecheckInput, Decision, RuleResult, Rule } from './types';
import { evaluateBlacklistWhitelist } from './rules/blacklistWhitelist';
import { evaluateThresholds } from './rules/thresholds';
import { evaluateCorridor } from './rules/corridor';

const DEFAULT_RULES: Rule[] = [
  evaluateBlacklistWhitelist,
  evaluateThresholds,
  evaluateCorridor,
];

function aggregateResults(results: RuleResult[]): Decision {
  const reasons: string[] = [];
  let status: Decision['status'] = 'ALLOW';

  for (const r of results) {
    if (r.reason) reasons.push(r.reason);
    if (r.outcome === 'BLOCK') status = 'BLOCK';
    else if (r.outcome === 'REVIEW' && status !== 'BLOCK') status = 'REVIEW';
  }

  return { status, reasons };
}

export type PolicyEngineOptions = { rules?: Rule[] };

export function createPolicyEngine(options: PolicyEngineOptions = {}) {
  const rules = options.rules ?? DEFAULT_RULES;

  return {
    async evaluate(input: PrecheckInput): Promise<{ decision: Decision; ruleResults: RuleResult[] }> {
      const ruleResults: RuleResult[] = [];
      for (const rule of rules) {
        const result = await Promise.resolve(rule(input));
        ruleResults.push(result);
      }
      const decision = aggregateResults(ruleResults);
      return { decision, ruleResults };
    },
  };
}

export const policyEngine = createPolicyEngine();

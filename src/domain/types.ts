import type { PrecheckBody } from '../utils/validate';

export type PrecheckInput = PrecheckBody;

export type DecisionStatus = 'ALLOW' | 'BLOCK' | 'REVIEW';

export type RuleResult = {
  ruleName: string;
  outcome: DecisionStatus;
  reason?: string;
};

export type Decision = {
  status: DecisionStatus;
  reasons: string[];
};

export type Rule = (input: PrecheckInput) => RuleResult | Promise<RuleResult>;

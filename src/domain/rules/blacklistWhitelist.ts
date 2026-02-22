import type { PrecheckInput, RuleResult } from '../types';
import { prisma } from '../../db/prisma';
import { getConfig } from '../../utils/validate';

const RULE_NAME = 'blacklistWhitelist';

function identifiers(input: PrecheckInput): { sender: string[]; receiver: string[] } {
  const sender = [input.sender.id];
  const receiver = [input.receiver.id];
  if (input.sender.wallet) sender.push(input.sender.wallet);
  if (input.receiver.wallet) receiver.push(input.receiver.wallet);
  return { sender, receiver };
}

export async function evaluateBlacklistWhitelist(input: PrecheckInput): Promise<RuleResult> {
  const config = getConfig();
  const { sender: senderIds, receiver: receiverIds } = identifiers(input);

  for (const id of [...senderIds, ...receiverIds]) {
    const blacklisted = await prisma.listEntry.findUnique({
      where: { listType_address: { listType: 'blacklist', address: id } },
    });
    if (blacklisted) {
      return { ruleName: RULE_NAME, outcome: 'BLOCK', reason: `Counterparty on blacklist: ${id}` };
    }
  }

  if (!config.whitelistRequired) {
    return { ruleName: RULE_NAME, outcome: 'ALLOW' };
  }

  const senderListed = await Promise.all(
    senderIds.map((id) =>
      prisma.listEntry.findUnique({
        where: { listType_address: { listType: 'whitelist', address: id } },
      })
    )
  ).then((rows) => rows.some((r) => r != null));
  const receiverListed = await Promise.all(
    receiverIds.map((id) =>
      prisma.listEntry.findUnique({
        where: { listType_address: { listType: 'whitelist', address: id } },
      })
    )
  ).then((rows) => rows.some((r) => r != null));

  if (senderListed && receiverListed) {
    return { ruleName: RULE_NAME, outcome: 'ALLOW' };
  }

  const action = config.whitelistNonListedAction;
  return {
    ruleName: RULE_NAME,
    outcome: action,
    reason: 'One or both counterparties not on whitelist',
  };
}

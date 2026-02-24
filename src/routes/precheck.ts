import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { precheckBodySchema } from '../utils/validate';
import { policyEngine } from '../domain/policyEngine';
import { signDecisionToken, verifyDecisionToken } from '../domain/decisionSigner';
import type { Prisma } from '@prisma/client';
import { prisma } from '../db/prisma';
import { sha256InputSnapshot } from '../utils/hash';

const verifyTokenBodySchema = z.object({ token: z.string().min(1) });

export const precheckRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>('/v1/verify-decision-token', async (request, reply) => {
    const parse = verifyTokenBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }
    const decoded = verifyDecisionToken(parse.data.token);
    if (decoded == null) {
      return reply.status(401).send({
        valid: false,
        error: 'Invalid or expired token',
      });
    }
    const decision = await prisma.complianceDecision.findUnique({
      where: { id: decoded.decisionId },
    });
    const dbStatusMatch = decision != null && decision.status === decoded.status;
    return reply.send({
      valid: true,
      decoded: {
        decisionId: decoded.decisionId,
        status: decoded.status,
        senderId: decoded.senderId,
        receiverId: decoded.receiverId,
        amount: decoded.amount,
        currency: decoded.currency,
        issuedAt: new Date(decoded.issuedAt * 1000).toISOString(),
      },
      dbCheck: {
        found: decision != null,
        statusMatch: dbStatusMatch,
        dbStatus: decision?.status ?? null,
      },
    });
  });

  app.post<{
    Body: unknown;
  }>('/v1/precheck', async (request, reply) => {
    const parse = precheckBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }

    const input = parse.data;
    const inputSnapshotHash = sha256InputSnapshot(input);
    const { decision, ruleResults } = await policyEngine.evaluate(input);

    const issuedAt = new Date();
    const decisionRecord = await prisma.complianceDecision.create({
      data: {
        status: decision.status,
        reasons: decision.reasons,
        sender: input.sender.id,
        receiver: input.receiver.id,
        amount: String(input.amount.value),
        currency: input.amount.currency,
        inputSnapshotHash,
      },
    });

    for (const r of ruleResults) {
      const reasons: string[] = r.reason != null ? [r.reason] : [];
      await prisma.auditLog.create({
        data: {
          decisionId: decisionRecord.id,
          ruleName: r.ruleName,
          inputSnapshotHash,
          outcome: r.outcome,
          reasons,
          type: `rule:${r.ruleName}`,
          payload: { ruleName: r.ruleName, outcome: r.outcome, reason: r.reason ?? null } as Prisma.InputJsonValue,
        },
      });
    }

    const signedDecisionToken = signDecisionToken({
      decisionId: decisionRecord.id,
      status: decision.status,
      senderId: input.sender.id,
      receiverId: input.receiver.id,
      amount: input.amount.value,
      currency: input.amount.currency,
    });

    return reply.send({
      decisionId: decisionRecord.id,
      status: decision.status,
      reasons: decision.reasons,
      signedDecisionToken,
      issuedAt: issuedAt.toISOString(),
    });
  });
};

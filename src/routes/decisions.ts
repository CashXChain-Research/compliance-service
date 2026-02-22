import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma';

type AuditLogRow = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number];

const idParamSchema = z.object({ id: z.string().uuid() });

export const decisionsRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: unknown }>('/v1/decisions/:id', async (request, reply) => {
    const parse = idParamSchema.safeParse(request.params);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }
    const { id } = parse.data;

    const decision = await prisma.complianceDecision.findUnique({
      where: { id },
      include: {
        auditLogs: { orderBy: { createdAt: 'asc' } },
      },
    });

    if (decision == null) {
      return reply.status(404).send({ error: 'Decision not found', id });
    }

    const auditLogs = decision.auditLogs.map((log: AuditLogRow) => ({
      id: log.id,
      decisionId: log.decisionId,
      ruleName: log.ruleName,
      inputSnapshotHash: log.inputSnapshotHash,
      outcome: log.outcome,
      reasons: log.reasons as string[] | null,
      timestamp: log.createdAt.toISOString(),
    }));

    return reply.send({
      decision: {
        id: decision.id,
        status: decision.status,
        reasons: decision.reasons as string[] | null,
        sender: decision.sender,
        receiver: decision.receiver,
        amount: decision.amount,
        currency: decision.currency,
        inputSnapshotHash: decision.inputSnapshotHash,
        createdAt: decision.createdAt.toISOString(),
      },
      auditLogs,
    });
  });
};

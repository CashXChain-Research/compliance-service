import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db/prisma';

type AuditLogRow = Awaited<ReturnType<typeof prisma.auditLog.findMany>>[number];

/**
 * Audit log is append-only: no update or delete endpoints.
 * Only create is used (from precheck rule evaluation).
 */

const auditQuerySchema = z.object({
  decisionId: z.string().uuid().optional(),
  from: z.string().optional(), // ISO date or datetime
  to: z.string().optional(),
});

export const auditRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Querystring: unknown }>('/v1/audit', async (request, reply) => {
    const parse = auditQuerySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }
    const { decisionId, from, to } = parse.data;

    const where: { decisionId?: string; createdAt?: { gte?: Date; lte?: Date } } = {};
    if (decisionId != null) where.decisionId = decisionId;
    if (from != null || to != null) {
      where.createdAt = {};
      if (from != null) where.createdAt.gte = new Date(from);
      if (to != null) where.createdAt.lte = new Date(to);
    }

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const entries = logs.map((log: AuditLogRow) => ({
      id: log.id,
      decisionId: log.decisionId,
      ruleName: log.ruleName,
      inputSnapshotHash: log.inputSnapshotHash,
      outcome: log.outcome,
      reasons: log.reasons as string[] | null,
      timestamp: log.createdAt.toISOString(),
    }));

    return reply.send({ entries });
  });
};

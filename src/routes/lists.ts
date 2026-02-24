import { FastifyPluginAsync } from 'fastify';
import {
  createListEntryBodySchema,
  listEntriesQuerySchema,
} from '../utils/validate';
import { prisma } from '../db/prisma';

type ListEntryRow = Awaited<ReturnType<typeof prisma.listEntry.findMany>>[number];

function apiListTypeToDb(type: 'BLACKLIST' | 'WHITELIST'): string {
  return type.toLowerCase();
}

export const listsRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Body: unknown }>('/v1/lists/entries', async (request, reply) => {
    const parse = createListEntryBodySchema.safeParse(request.body);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }
    const { type, counterpartyId, reason, scope } = parse.data;
    const listType = apiListTypeToDb(type);
    const entry = await prisma.listEntry.upsert({
      where: { listType_address: { listType, address: counterpartyId } },
      create: { listType, address: counterpartyId, reason: reason ?? null, scope: scope ?? null },
      update: { reason: reason ?? null, scope: scope ?? null },
    });
    return reply.status(201).send({
      id: entry.id,
      type,
      counterpartyId: entry.address,
      reason: entry.reason,
      scope: entry.scope,
      createdAt: entry.createdAt.toISOString(),
    });
  });

  app.get<{ Querystring: unknown }>('/v1/lists/entries', async (request, reply) => {
    const parse = listEntriesQuerySchema.safeParse(request.query);
    if (!parse.success) {
      return reply.status(400).send({
        error: 'Validation failed',
        details: parse.error.flatten(),
      });
    }
    const { type } = parse.data;
    const where = type ? { listType: apiListTypeToDb(type) } : {};
    const entries = await prisma.listEntry.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });
    const items = entries.map((e: ListEntryRow) => ({
      id: e.id,
      type: e.listType.toUpperCase() as 'BLACKLIST' | 'WHITELIST',
      counterpartyId: e.address,
      reason: e.reason,
      scope: e.scope,
      createdAt: e.createdAt.toISOString(),
    }));
    return reply.send({ entries: items });
  });
};

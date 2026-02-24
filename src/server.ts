import 'dotenv/config';
import Fastify from 'fastify';
import { precheckRoutes } from './routes/precheck';
import { listsRoutes } from './routes/lists';
import { decisionsRoutes } from './routes/decisions';
import { auditRoutes } from './routes/audit';

const loggerOpts =
  process.env.NODE_ENV !== 'production'
    ? {
        level: process.env.LOG_LEVEL ?? 'info',
        transport: { target: 'pino-pretty' as const, options: { colorize: true } },
      }
    : { level: process.env.LOG_LEVEL ?? 'info' };

const app = Fastify({ logger: loggerOpts });

app.get('/health', async (_request, reply) => {
  return reply.send({ status: 'ok' });
});

async function start() {
  await app.register(precheckRoutes);
  await app.register(listsRoutes);
  await app.register(decisionsRoutes);
  await app.register(auditRoutes);
  const port = Number(process.env.PORT) || 3000;
  await app.listen({ port, host: '0.0.0.0' });
  app.log.info({ port }, 'server listening');
}

start().catch((err: NodeJS.ErrnoException) => {
  const message = err?.code === 'EADDRINUSE'
    ? `Port ${Number(process.env.PORT) || 3000} already in use. Stop the other process or set PORT to a different value.`
    : err?.message ?? String(err);
  console.error('[ERROR] server failed:', message);
  if (err?.stack) console.error(err.stack);
  process.exit(1);
});

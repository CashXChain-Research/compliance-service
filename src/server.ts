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

start().catch((err) => {
  app.log.error({ err }, 'server failed');
  process.exit(1);
});

console.log(app.printRoutes());

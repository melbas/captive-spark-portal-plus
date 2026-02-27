import 'dotenv/config';
import Fastify from 'fastify';
import fastifyCookie from '@fastify/cookie';
import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { fastifyTRPCPlugin } from '@fastify/trpc-plugin';
import { createContext } from './trpc.js';
import { appRouter } from './routers/index.js';
import { webhookRoutes } from './routes/webhooks.js';

const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? '0.0.0.0';

async function bootstrap() {
  const app = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
      transport: process.env.NODE_ENV !== 'production'
        ? { target: 'pino-pretty', options: { colorize: true } }
        : undefined,
    },
  });

  // ─── Sécurité ──────────────────────────────────────────────────────────────
  await app.register(fastifyHelmet, {
    contentSecurityPolicy: false, // Géré par le frontend
  });

  await app.register(fastifyRateLimit, {
    max: 100,
    timeWindow: '1 minute',
    skipOnError: true,
  });

  // ─── CORS ──────────────────────────────────────────────────────────────────
  await app.register(fastifyCors, {
    origin: process.env.CORS_ORIGINS?.split(',') ?? ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  });

  // ─── Cookies ──────────────────────────────────────────────────────────────
  await app.register(fastifyCookie, {
    secret: process.env.COOKIE_SECRET ?? 'change-this-cookie-secret-in-production',
  });

  // ─── tRPC ──────────────────────────────────────────────────────────────────
  await app.register(fastifyTRPCPlugin, {
    prefix: '/api/trpc',
    trpcOptions: {
      router: appRouter,
      createContext,
      onError: ({ error, path }: any) => {
        if (error.code === 'INTERNAL_SERVER_ERROR') {
          console.error(`[tRPC Error] ${path}:`, error);
        }
      },
    },
  });

  // ─── Webhooks (Wave, Orange Money) ────────────────────────────────────────
  await app.register(webhookRoutes, { prefix: '/api/webhooks' });

  // ─── Health check ─────────────────────────────────────────────────────────
  app.get('/health', async () => ({
    status: 'ok',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  }));

  // ─── Démarrage ─────────────────────────────────────────────────────────────
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log(`\n🚀 PremiumConnect API démarrée sur http://${HOST}:${PORT}`);
    console.log(`   tRPC : http://${HOST}:${PORT}/api/trpc`);
    console.log(`   Santé : http://${HOST}:${PORT}/health\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();

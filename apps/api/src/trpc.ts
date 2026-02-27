import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { verifyAdminToken } from './middleware/auth.js';

export type TrpcContext = {
  req: FastifyRequest;
  res: FastifyReply;
  admin: { id: string; role: string; resellerId: string | null } | null;
};

export function createContext({ req, res }: { req: FastifyRequest; res: FastifyReply }): TrpcContext {
  return { req, res, admin: null };
}

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const token = ctx.req.cookies?.['pc_admin_token']
    ?? ctx.req.headers.authorization?.replace('Bearer ', '');

  if (!token) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Authentification requise' });

  const admin = await verifyAdminToken(token);
  if (!admin) throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Token invalide ou expiré' });

  return next({ ctx: { ...ctx, admin } });
});

export const superAdminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.admin?.role !== 'super_admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès super-admin requis' });
  }
  return next({ ctx });
});

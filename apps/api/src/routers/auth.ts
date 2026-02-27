import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { publicProcedure, protectedProcedure, router } from '../trpc.js';
import { getDb, schema } from '../db/index.js';
import { signAdminToken } from '../middleware/auth.js';
import { getDb as getDbQuery } from '../db/index.js';

const { adminUsers, auditLogs } = schema;

export const authRouter = router({

  // ─── Login admin ───────────────────────────────────────────────────────────
  login: publicProcedure
    .input(z.object({
      email: z.string().email(),
      password: z.string().min(8),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const users = await db.select().from(adminUsers)
        .where(eq(adminUsers.email, input.email.toLowerCase()))
        .limit(1);

      const user = users[0];
      if (!user || !user.isActive) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' });
      }

      const valid = await bcrypt.compare(input.password, user.passwordHash);
      if (!valid) {
        throw new TRPCError({ code: 'UNAUTHORIZED', message: 'Email ou mot de passe incorrect' });
      }

      // Mettre à jour last_login_at
      await db.update(adminUsers)
        .set({ lastLoginAt: new Date() })
        .where(eq(adminUsers.id, user.id));

      // Log d'audit
      await db.insert(auditLogs).values({
        adminId: user.id,
        action: 'admin.login',
        details: { email: user.email },
        ipAddress: ctx.req.ip,
      });

      const token = await signAdminToken({
        id: user.id,
        role: user.role!,
        resellerId: user.resellerId,
        email: user.email,
      });

      // Définir le cookie sécurisé
      ctx.res.setCookie('pc_admin_token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 86400,
        path: '/',
      });

      return {
        token,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          resellerId: user.resellerId,
        },
      };
    }),

  // ─── Logout ────────────────────────────────────────────────────────────────
  logout: protectedProcedure
    .mutation(({ ctx }) => {
      ctx.res.clearCookie('pc_admin_token', { path: '/' });
      return { success: true };
    }),

  // ─── Profil courant ────────────────────────────────────────────────────────
  me: protectedProcedure
    .query(({ ctx }) => ctx.admin),
});

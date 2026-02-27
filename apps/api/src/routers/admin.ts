import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { eq, and, desc, gte, sql, count, sum } from 'drizzle-orm';
import { protectedProcedure, superAdminProcedure, router } from '../trpc.js';
import { getDb, schema } from '../db/index.js';
import { encrypt, decrypt } from '../services/crypto.js';
import { createAdapter } from '../services/hardware/adapter.js';
import { nanoid } from 'nanoid';

const {
  resellers, sites, hardwareIntegrations, wifiPlans,
  wifiUsers, wifiSessions, transactions, vouchers, adminUsers, auditLogs
} = schema;

// ─── Helper : log d'audit ─────────────────────────────────────────────────────
async function audit(adminId: string, action: string, entityType: string, entityId: string, details?: object) {
  const db = getDb();
  await db.insert(auditLogs).values({ adminId, action, entityType, entityId: entityId as any, details });
}

// ─── Revendeurs ───────────────────────────────────────────────────────────────
export const resellersRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    if (ctx.admin?.role === 'super_admin') {
      return db.select().from(resellers).orderBy(desc(resellers.createdAt));
    }
    // Revendeur : voir uniquement son propre profil
    return db.select().from(resellers).where(eq(resellers.id, ctx.admin!.resellerId!));
  }),

  create: superAdminProcedure
    .input(z.object({
      name: z.string().min(2),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      address: z.string().optional(),
      commissionRate: z.number().min(0).max(30).default(15),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const inserted = await db.insert(resellers).values({
        name: input.name,
        email: input.email,
        phone: input.phone,
        address: input.address,
        commissionRate: String(input.commissionRate),
      }).returning();
      await audit(ctx.admin!.id, 'reseller.create', 'reseller', inserted[0]!.id, { name: input.name });
      return inserted[0]!;
    }),

  update: superAdminProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().min(2).optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      commissionRate: z.number().min(0).max(30).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(resellers).set({
        ...data,
        commissionRate: data.commissionRate !== undefined ? String(data.commissionRate) : undefined,
        updatedAt: new Date(),
      }).where(eq(resellers.id, id));
      await audit(ctx.admin!.id, 'reseller.update', 'reseller', id, data);
      return { success: true };
    }),
});

// ─── Sites ────────────────────────────────────────────────────────────────────
export const sitesRouter = router({
  list: protectedProcedure.query(async ({ ctx }) => {
    const db = getDb();
    if (ctx.admin?.role === 'super_admin') {
      return db.select({
        id: sites.id, name: sites.name, portalSlug: sites.portalSlug,
        location: sites.location, type: sites.type, isActive: sites.isActive,
        resellerId: sites.resellerId, createdAt: sites.createdAt,
        resellerName: resellers.name,
      })
      .from(sites)
      .leftJoin(resellers, eq(sites.resellerId, resellers.id))
      .orderBy(desc(sites.createdAt));
    }
    return db.select({
      id: sites.id, name: sites.name, portalSlug: sites.portalSlug,
      location: sites.location, type: sites.type, isActive: sites.isActive,
      resellerId: sites.resellerId, createdAt: sites.createdAt,
      resellerName: resellers.name,
    })
    .from(sites)
    .leftJoin(resellers, eq(sites.resellerId, resellers.id))
    .where(eq(sites.resellerId, ctx.admin!.resellerId!));
  }),

  create: protectedProcedure
    .input(z.object({
      name: z.string().min(2),
      location: z.string().optional(),
      type: z.enum(['hotel','restaurant','campus','public','commerce','institution','other']).optional(),
      welcomeMsg: z.string().optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      whatsappSupport: z.string().optional(),
      resellerId: z.string().uuid().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const resellerId = ctx.admin?.role === 'super_admin'
        ? (input.resellerId ?? ctx.admin.resellerId)
        : ctx.admin!.resellerId;

      // Générer un slug unique
      const baseSlug = input.name.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const slug = `${baseSlug}-${nanoid(6)}`;

      const inserted = await db.insert(sites).values({
        resellerId,
        name: input.name,
        portalSlug: slug,
        location: input.location,
        type: input.type,
        welcomeMsg: input.welcomeMsg,
        primaryColor: input.primaryColor ?? '#5B4DFF',
        whatsappSupport: input.whatsappSupport,
      }).returning();

      await audit(ctx.admin!.id, 'site.create', 'site', inserted[0]!.id, { name: input.name, slug });
      return inserted[0]!;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string().uuid(),
      name: z.string().optional(),
      location: z.string().optional(),
      welcomeMsg: z.string().optional(),
      primaryColor: z.string().optional(),
      whatsappSupport: z.string().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(sites).set({ ...data, updatedAt: new Date() }).where(eq(sites.id, id));
      await audit(ctx.admin!.id, 'site.update', 'site', id, data);
      return { success: true };
    }),

  // Configurer l'intégration hardware d'un site
  setHardware: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid(),
      brand: z.enum(['ubiquiti','mikrotik','cisco','huawei','tplink']),
      controllerUrl: z.string().url(),
      username: z.string(),
      password: z.string(),
      unifiSiteId: z.string().default('default'),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const passwordEnc = encrypt(input.password);

      // Upsert : supprimer l'ancienne config et insérer la nouvelle
      await db.delete(hardwareIntegrations).where(eq(hardwareIntegrations.siteId, input.siteId));
      const inserted = await db.insert(hardwareIntegrations).values({
        siteId: input.siteId,
        brand: input.brand,
        controllerUrl: input.controllerUrl,
        apiUsername: input.username,
        apiPasswordEnc: passwordEnc,
        unifiSiteId: input.unifiSiteId,
        isActive: true,
      }).returning();

      await audit(ctx.admin!.id, 'hardware.configure', 'hardware_integration', inserted[0]!.id, {
        brand: input.brand, siteId: input.siteId,
      });
      return { success: true };
    }),

  // Tester la connexion hardware
  testHardware: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const hw = await db.select().from(hardwareIntegrations)
        .where(and(eq(hardwareIntegrations.siteId, input.siteId), eq(hardwareIntegrations.isActive, true)))
        .limit(1);

      if (!hw[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Aucune intégration hardware configurée' });

      const password = hw[0].apiPasswordEnc ? decrypt(hw[0].apiPasswordEnc) : '';
      const adapter = await createAdapter({
        brand: hw[0].brand,
        controllerUrl: hw[0].controllerUrl,
        username: hw[0].apiUsername ?? '',
        password,
        siteId: hw[0].unifiSiteId ?? 'default',
      });

      const result = await adapter.testConnection();

      // Mettre à jour le statut du test
      await db.update(hardwareIntegrations)
        .set({ lastTestedAt: new Date(), lastTestOk: result.success, lastTestMsg: result.message })
        .where(eq(hardwareIntegrations.id, hw[0].id));

      return result;
    }),
});

// ─── Sessions actives ─────────────────────────────────────────────────────────
export const sessionsRouter = router({
  listActive: protectedProcedure
    .input(z.object({ siteId: z.string().uuid().optional() }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [eq(wifiSessions.status, 'active')];
      if (input.siteId) conditions.push(eq(wifiSessions.siteId, input.siteId));
      else if (ctx.admin?.role !== 'super_admin' && ctx.admin?.resellerId) {
        // Filtrer par les sites du revendeur
        const resellerSites = await db.select({ id: sites.id }).from(sites)
          .where(eq(sites.resellerId, ctx.admin.resellerId));
        const siteIds = resellerSites.map(s => s.id);
        if (siteIds.length === 0) return [];
        conditions.push(sql`${wifiSessions.siteId} = ANY(${siteIds})`);
      }

      return db.select({
        id: wifiSessions.id,
        macAddress: wifiSessions.macAddress,
        ssid: wifiSessions.ssid,
        startedAt: wifiSessions.startedAt,
        expiresAt: wifiSessions.expiresAt,
        siteId: wifiSessions.siteId,
        siteName: sites.name,
        userPhone: wifiUsers.phone,
        userName: wifiUsers.name,
        planName: wifiPlans.name,
        priceFcfa: wifiPlans.priceFcfa,
      })
      .from(wifiSessions)
      .leftJoin(sites, eq(wifiSessions.siteId, sites.id))
      .leftJoin(wifiUsers, eq(wifiSessions.userId, wifiUsers.id))
      .leftJoin(wifiPlans, eq(wifiSessions.planId, wifiPlans.id))
      .where(and(...conditions))
      .orderBy(desc(wifiSessions.startedAt))
      .limit(200);
    }),

  revoke: protectedProcedure
    .input(z.object({ sessionId: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      const session = await db.select().from(wifiSessions).where(eq(wifiSessions.id, input.sessionId)).limit(1);
      if (!session[0]) throw new TRPCError({ code: 'NOT_FOUND' });

      // Révoquer côté hardware si configuré
      const hw = await db.select().from(hardwareIntegrations)
        .where(and(eq(hardwareIntegrations.siteId, session[0].siteId!), eq(hardwareIntegrations.isActive, true)))
        .limit(1);

      if (hw[0]) {
        try {
          const password = hw[0].apiPasswordEnc ? decrypt(hw[0].apiPasswordEnc) : '';
          const adapter = await createAdapter({
            brand: hw[0].brand,
            controllerUrl: hw[0].controllerUrl,
            username: hw[0].apiUsername ?? '',
            password,
            siteId: hw[0].unifiSiteId ?? 'default',
          });
          await adapter.revoke(session[0].macAddress, hw[0].unifiSiteId ?? 'default');
        } catch (err) {
          console.error('[Revoke] Hardware error:', err);
        }
      }

      await db.update(wifiSessions)
        .set({ status: 'revoked', endedAt: new Date() })
        .where(eq(wifiSessions.id, input.sessionId));

      await audit(ctx.admin!.id, 'session.revoke', 'wifi_session', input.sessionId);
      return { success: true };
    }),
});

// ─── Transactions ─────────────────────────────────────────────────────────────
export const transactionsRouter = router({
  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid().optional(),
      status: z.enum(['pending','completed','failed','refunded']).optional(),
      limit: z.number().min(1).max(500).default(100),
      offset: z.number().min(0).default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = getDb();
      const conditions = [];
      if (input.siteId) conditions.push(eq(transactions.siteId, input.siteId));
      if (input.status) conditions.push(eq(transactions.status, input.status));

      return db.select({
        id: transactions.id,
        amountFcfa: transactions.amountFcfa,
        commissionFcfa: transactions.commissionFcfa,
        method: transactions.method,
        status: transactions.status,
        createdAt: transactions.createdAt,
        completedAt: transactions.completedAt,
        siteName: sites.name,
        userPhone: wifiUsers.phone,
        planName: wifiPlans.name,
      })
      .from(transactions)
      .leftJoin(sites, eq(transactions.siteId, sites.id))
      .leftJoin(wifiUsers, eq(transactions.userId, wifiUsers.id))
      .leftJoin(wifiPlans, eq(transactions.planId, wifiPlans.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(transactions.createdAt))
      .limit(input.limit)
      .offset(input.offset);
    }),

  getKPIs: protectedProcedure
    .input(z.object({ siteId: z.string().uuid().optional() }))
    .query(async ({ input }) => {
      const db = getDb();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

      const conditions = [eq(transactions.status, 'completed')];
      if (input.siteId) conditions.push(eq(transactions.siteId, input.siteId));

      const [todayStats, monthStats, totalSessions] = await Promise.all([
        db.select({
          revenue: sum(transactions.amountFcfa),
          txCount: count(transactions.id),
        }).from(transactions)
          .where(and(...conditions, gte(transactions.completedAt, today))),

        db.select({
          revenue: sum(transactions.amountFcfa),
          txCount: count(transactions.id),
        }).from(transactions)
          .where(and(...conditions, gte(transactions.completedAt, monthStart))),

        db.select({ count: count(wifiSessions.id) }).from(wifiSessions)
          .where(eq(wifiSessions.status, 'active')),
      ]);

      return {
        todayRevenueFcfa: Number(todayStats[0]?.revenue ?? 0),
        todayTransactions: Number(todayStats[0]?.txCount ?? 0),
        monthRevenueFcfa: Number(monthStats[0]?.revenue ?? 0),
        monthTransactions: Number(monthStats[0]?.txCount ?? 0),
        activeSessions: Number(totalSessions[0]?.count ?? 0),
      };
    }),
});

// ─── Forfaits ─────────────────────────────────────────────────────────────────
export const plansRouter = router({
  list: protectedProcedure
    .input(z.object({ siteId: z.string().uuid() }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select().from(wifiPlans)
        .where(eq(wifiPlans.siteId, input.siteId))
        .orderBy(wifiPlans.sortOrder);
    }),

  upsert: protectedProcedure
    .input(z.object({
      id: z.string().uuid().optional(),
      siteId: z.string().uuid(),
      name: z.string().min(1),
      durationMin: z.number().min(1),
      priceFcfa: z.number().min(0),
      speedDownMb: z.number().default(10),
      speedUpMb: z.number().default(5),
      dataLimitMb: z.number().optional(),
      maxDevices: z.number().default(1),
      isPopular: z.boolean().default(false),
      isActive: z.boolean().default(true),
      sortOrder: z.number().default(0),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      if (input.id) {
        await db.update(wifiPlans).set({ ...input }).where(eq(wifiPlans.id, input.id));
        await audit(ctx.admin!.id, 'plan.update', 'wifi_plan', input.id, { name: input.name });
        return { id: input.id };
      }
      const inserted = await db.insert(wifiPlans).values({ ...input }).returning();
      await audit(ctx.admin!.id, 'plan.create', 'wifi_plan', inserted[0]!.id, { name: input.name });
      return { id: inserted[0]!.id };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(wifiPlans).set({ isActive: false }).where(eq(wifiPlans.id, input.id));
      await audit(ctx.admin!.id, 'plan.delete', 'wifi_plan', input.id);
      return { success: true };
    }),
});

// ─── Utilisateurs WiFi ────────────────────────────────────────────────────────
export const usersRouter = router({
  list: protectedProcedure
    .input(z.object({
      siteId: z.string().uuid().optional(),
      segment: z.string().optional(),
      atRisk: z.boolean().optional(),
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input.siteId) conditions.push(eq(wifiUsers.siteId, input.siteId));
      if (input.segment) conditions.push(eq(wifiUsers.aiSegment, input.segment as any));
      if (input.atRisk) conditions.push(sql`${wifiUsers.churnRisk} >= 0.40`);

      return db.select({
        id: wifiUsers.id,
        phone: wifiUsers.phone,
        email: wifiUsers.email,
        name: wifiUsers.name,
        loyaltyPts: wifiUsers.loyaltyPts,
        loyaltyLevel: wifiUsers.loyaltyLevel,
        churnRisk: wifiUsers.churnRisk,
        aiSegment: wifiUsers.aiSegment,
        isBlocked: wifiUsers.isBlocked,
        lastSeenAt: wifiUsers.lastSeenAt,
        createdAt: wifiUsers.createdAt,
        siteName: sites.name,
      })
      .from(wifiUsers)
      .leftJoin(sites, eq(wifiUsers.siteId, sites.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(desc(wifiUsers.lastSeenAt))
      .limit(input.limit)
      .offset(input.offset);
    }),

  block: protectedProcedure
    .input(z.object({ userId: z.string().uuid(), blocked: z.boolean() }))
    .mutation(async ({ input, ctx }) => {
      const db = getDb();
      await db.update(wifiUsers).set({ isBlocked: input.blocked }).where(eq(wifiUsers.id, input.userId));
      await audit(ctx.admin!.id, input.blocked ? 'user.block' : 'user.unblock', 'wifi_user', input.userId);
      return { success: true };
    }),
});

// ─── Logs d'audit ─────────────────────────────────────────────────────────────
export const logsRouter = router({
  list: protectedProcedure
    .input(z.object({
      limit: z.number().default(100),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => {
      const db = getDb();
      return db.select({
        id: auditLogs.id,
        action: auditLogs.action,
        entityType: auditLogs.entityType,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        createdAt: auditLogs.createdAt,
        adminName: adminUsers.name,
        adminEmail: adminUsers.email,
      })
      .from(auditLogs)
      .leftJoin(adminUsers, eq(auditLogs.adminId, adminUsers.id))
      .orderBy(desc(auditLogs.createdAt))
      .limit(input.limit)
      .offset(input.offset);
    }),
});

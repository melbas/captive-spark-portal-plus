import { eq, and } from 'drizzle-orm';
import { getDb, schema } from '../index.js';

const { sites, wifiPlans, hardwareIntegrations, wifiUsers, wifiSessions, transactions } = schema;

// ─── Site ─────────────────────────────────────────────────────────────────────

export async function getSiteBySlug(slug: string) {
  const db = getDb();
  const result = await db
    .select()
    .from(sites)
    .where(and(eq(sites.portalSlug, slug), eq(sites.isActive, true)))
    .limit(1);
  return result[0] ?? null;
}

export async function getSiteWithHardware(siteId: string) {
  const db = getDb();
  const [site, hardware] = await Promise.all([
    db.select().from(sites).where(eq(sites.id, siteId)).limit(1),
    db.select().from(hardwareIntegrations)
      .where(and(eq(hardwareIntegrations.siteId, siteId), eq(hardwareIntegrations.isActive, true)))
      .limit(1),
  ]);
  return { site: site[0] ?? null, hardware: hardware[0] ?? null };
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export async function getPlansBySite(siteId: string) {
  const db = getDb();
  return db
    .select()
    .from(wifiPlans)
    .where(and(eq(wifiPlans.siteId, siteId), eq(wifiPlans.isActive, true)))
    .orderBy(wifiPlans.sortOrder);
}

export async function getPlanById(planId: string) {
  const db = getDb();
  const result = await db.select().from(wifiPlans).where(eq(wifiPlans.id, planId)).limit(1);
  return result[0] ?? null;
}

// ─── Utilisateurs WiFi ────────────────────────────────────────────────────────

export async function findOrCreateWifiUser(siteId: string, phone?: string, email?: string) {
  const db = getDb();

  // Chercher par téléphone ou email
  let existing = null;
  if (phone) {
    const r = await db.select().from(wifiUsers)
      .where(and(eq(wifiUsers.siteId, siteId), eq(wifiUsers.phone, phone)))
      .limit(1);
    existing = r[0] ?? null;
  } else if (email) {
    const r = await db.select().from(wifiUsers)
      .where(and(eq(wifiUsers.siteId, siteId), eq(wifiUsers.email, email)))
      .limit(1);
    existing = r[0] ?? null;
  }

  if (existing) {
    // Mettre à jour last_seen_at
    await db.update(wifiUsers)
      .set({ lastSeenAt: new Date() })
      .where(eq(wifiUsers.id, existing.id));
    return existing;
  }

  // Créer un nouvel utilisateur
  const referralCode = generateReferralCode();
  const inserted = await db.insert(wifiUsers).values({
    siteId,
    phone: phone ?? null,
    email: email ?? null,
    referralCode,
  }).returning();

  return inserted[0]!;
}

export async function updateUserLoyalty(userId: string, ptsToAdd: number) {
  const db = getDb();
  const user = await db.select().from(wifiUsers).where(eq(wifiUsers.id, userId)).limit(1);
  if (!user[0]) return;

  const newPts = (user[0].loyaltyPts ?? 0) + ptsToAdd;
  const newLevel = computeLoyaltyLevel(newPts);

  await db.update(wifiUsers)
    .set({ loyaltyPts: newPts, loyaltyLevel: newLevel })
    .where(eq(wifiUsers.id, userId));
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

export async function createSession(data: {
  siteId: string;
  userId: string;
  planId: string;
  macAddress: string;
  apMac?: string;
  ssid?: string;
  durationMin: number;
}) {
  const db = getDb();
  const expiresAt = new Date(Date.now() + data.durationMin * 60 * 1000);

  const inserted = await db.insert(wifiSessions).values({
    siteId: data.siteId,
    userId: data.userId,
    planId: data.planId,
    macAddress: data.macAddress.toLowerCase(),
    apMac: data.apMac ?? null,
    ssid: data.ssid ?? null,
    expiresAt,
    status: 'active',
  }).returning();

  return inserted[0]!;
}

export async function revokeSession(sessionId: string) {
  const db = getDb();
  await db.update(wifiSessions)
    .set({ status: 'revoked', endedAt: new Date() })
    .where(eq(wifiSessions.id, sessionId));
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export async function createTransaction(data: {
  siteId: string;
  userId: string;
  planId: string;
  amountFcfa: number;
  commissionFcfa: number;
  method: 'wave' | 'orange_money' | 'free_money' | 'voucher' | 'free' | 'admin';
  waveCheckoutId?: string;
}) {
  const db = getDb();
  const inserted = await db.insert(transactions).values({
    siteId: data.siteId,
    userId: data.userId,
    planId: data.planId,
    amountFcfa: data.amountFcfa,
    commissionFcfa: data.commissionFcfa,
    method: data.method,
    status: 'pending',
    waveCheckoutId: data.waveCheckoutId ?? null,
  }).returning();
  return inserted[0]!;
}

export async function completeTransaction(txId: string, providerRef?: string, sessionId?: string) {
  const db = getDb();
  await db.update(transactions)
    .set({
      status: 'completed',
      completedAt: new Date(),
      providerRef: providerRef ?? null,
      sessionId: sessionId ?? null,
    })
    .where(eq(transactions.id, txId));
}

export async function failTransaction(txId: string) {
  const db = getDb();
  await db.update(transactions).set({ status: 'failed' }).where(eq(transactions.id, txId));
}

// ─── Helpers internes ─────────────────────────────────────────────────────────

function generateReferralCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

function computeLoyaltyLevel(pts: number): 'basic' | 'bronze' | 'silver' | 'gold' | 'platinum' {
  if (pts >= 5000) return 'platinum';
  if (pts >= 2000) return 'gold';
  if (pts >= 500)  return 'silver';
  if (pts >= 100)  return 'bronze';
  return 'basic';
}

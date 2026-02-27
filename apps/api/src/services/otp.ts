import { Redis } from 'ioredis';

// ============================================================
// Service OTP — Redis uniquement (Règle 6 Knowledge v3.0)
// JAMAIS stocker l'OTP dans useState, localStorage ou cookies
// ============================================================

let _redis: Redis | null = null;

function getRedis(): Redis {
  if (!_redis) {
    const url = process.env.REDIS_URL ?? 'redis://localhost:6379';
    _redis = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
  }
  return _redis;
}

const OTP_TTL_SECONDS = 300;       // 5 minutes
const MAX_ATTEMPTS = 3;
const RATE_LIMIT_WINDOW = 600;     // 10 minutes
const RATE_LIMIT_MAX = 3;          // 3 envois max par 10 min

/**
 * Générer et stocker un OTP pour un numéro de téléphone + site
 * Retourne le code généré (à envoyer par SMS)
 */
export async function generateOtp(phone: string, siteId: string): Promise<string> {
  const redis = getRedis();
  const rateLimitKey = `ratelimit:otp:${phone}:${siteId}`;

  // Vérifier le rate limiting
  const attempts = await redis.incr(rateLimitKey);
  if (attempts === 1) {
    await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
  }
  if (attempts > RATE_LIMIT_MAX) {
    const ttl = await redis.ttl(rateLimitKey);
    throw new Error(`Trop de tentatives. Réessayez dans ${Math.ceil(ttl / 60)} minutes.`);
  }

  // Générer un code à 6 chiffres
  const code = String(Math.floor(100000 + Math.random() * 900000));

  // Stocker dans Redis avec TTL
  const otpKey = `otp:${phone}:${siteId}`;
  await redis.setex(otpKey, OTP_TTL_SECONDS, JSON.stringify({ code, attempts: 0 }));

  return code;
}

/**
 * Vérifier un OTP
 * Retourne true si valide, false sinon
 * Supprime l'OTP après vérification réussie
 */
export async function verifyOtp(phone: string, siteId: string, inputCode: string): Promise<boolean> {
  const redis = getRedis();
  const otpKey = `otp:${phone}:${siteId}`;

  const stored = await redis.get(otpKey);
  if (!stored) return false;

  const data = JSON.parse(stored) as { code: string; attempts: number };

  // Incrémenter les tentatives
  data.attempts += 1;

  if (data.attempts > MAX_ATTEMPTS) {
    await redis.del(otpKey);
    throw new Error('Trop de tentatives incorrectes. Demandez un nouveau code.');
  }

  if (data.code !== inputCode) {
    // Mettre à jour le compteur de tentatives
    const ttl = await redis.ttl(otpKey);
    if (ttl > 0) {
      await redis.setex(otpKey, ttl, JSON.stringify(data));
    }
    return false;
  }

  // OTP valide — supprimer immédiatement
  await redis.del(otpKey);
  return true;
}

/**
 * Invalider un OTP (ex: après expiration manuelle)
 */
export async function invalidateOtp(phone: string, siteId: string): Promise<void> {
  const redis = getRedis();
  await redis.del(`otp:${phone}:${siteId}`);
}

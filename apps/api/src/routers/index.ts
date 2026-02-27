import { router } from '../trpc.js';
import { portalRouter } from './portal.js';
import { authRouter } from './auth.js';
import { resellersRouter, sitesRouter, sessionsRouter, transactionsRouter, plansRouter, usersRouter, logsRouter } from './admin.js';

export const appRouter = router({
  // ─── Portail captif (public) ─────────────────────────────────────────────
  portal: portalRouter,

  // ─── Authentification back-office ────────────────────────────────────────
  auth: authRouter,

  // ─── Back-office (protégé) ────────────────────────────────────────────────
  resellers: resellersRouter,
  sites: sitesRouter,
  sessions: sessionsRouter,
  transactions: transactionsRouter,
  plans: plansRouter,
  users: usersRouter,
  logs: logsRouter,
});

export type AppRouter = typeof appRouter;

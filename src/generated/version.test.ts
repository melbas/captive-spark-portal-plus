import { describe, expect, it } from 'vitest';
import { APP_VERSION, GIT_COMMIT, BUILD_DATE } from '@/generated/version';

describe('generated/version module', () => {
  it('importe les trois constantes sans erreur', () => {
    expect(APP_VERSION).toBeDefined();
    expect(GIT_COMMIT).toBeDefined();
    expect(BUILD_DATE).toBeDefined();
  });

  it('APP_VERSION respecte le SemVer', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('GIT_COMMIT est un short hash git (ou fallback "unknown")', () => {
    const commit: string = GIT_COMMIT;
    expect(commit === 'unknown' || /^[0-9a-f]{7,40}$/.test(commit)).toBe(true);
  });

  it('BUILD_DATE est au format YYYY-MM-DD', () => {
    expect(BUILD_DATE).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

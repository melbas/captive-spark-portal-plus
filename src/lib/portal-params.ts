import type { UnifiParams } from '@/types/premiumconnect';

export function readUnifiParams(): UnifiParams {
  const p = new URLSearchParams(window.location.search);
  return {
    mac: p.get('id') || p.get('mac') || null,
    apMac: p.get('ap') || null,
    ssid: p.get('ssid') || null,
    redirectUrl: p.get('url') || 'http://www.google.com',
  };
}

export function isRealUnifiSession(): boolean {
  const p = readUnifiParams();
  return p.mac !== null && !new URLSearchParams(window.location.search).has('demo');
}

export function PortalLoader() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4" style={{ background: 'var(--pc-bg)' }}>
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #5B4DFF, #FF4D6A)' }}
      >
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
          <path d="M1.42 9a16 16 0 0 1 21.16 0M5 12.55a11 11 0 0 1 14.08 0M10.54 16.1a6 6 0 0 1 2.92 0M12 20h.01"/>
        </svg>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="w-2 h-2 rounded-full pc-animate-pulse"
            style={{
              background: '#5B4DFF',
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
      <p className="text-sm font-medium" style={{ color: 'var(--pc-muted)' }}>Chargement du portail...</p>
    </div>
  );
}

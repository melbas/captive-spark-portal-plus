interface Props { message: string; }

export function PortalError({ message }: Props) {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6" style={{ background: 'var(--pc-bg)' }}>
      <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center text-3xl">⚠️</div>
      <h2 className="text-xl font-black text-center" style={{ color: 'var(--pc-text)' }}>Portail indisponible</h2>
      <p className="text-sm text-center" style={{ color: 'var(--pc-muted)' }}>{message}</p>
      <p className="text-xs text-center" style={{ color: 'var(--pc-muted)' }}>
        Vérifiez que l'URL du portail est correcte ou contactez l'administrateur.
      </p>
    </div>
  );
}

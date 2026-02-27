import { useState, useRef, useEffect } from 'react';
import { Phone, ArrowLeft, RefreshCw } from 'lucide-react';
import { trpc } from '../../lib/trpc';
import type { AuthState } from '../../pages/CaptivePortal';

interface Props {
  siteId: string;
  primaryColor: string;
  onSuccess: (auth: AuthState) => void;
}

type AuthStep = 'phone' | 'otp';

export function StepAuth({ siteId, primaryColor, onSuccess }: Props) {
  const [authStep, setAuthStep] = useState<AuthStep>('phone');
  const [phone, setPhone] = useState('+221 ');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(0);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const sendOtp = trpc.portal.sendOtp.useMutation();
  const verifyOtp = trpc.portal.verifyOtp.useMutation();

  // Countdown pour renvoi OTP
  useEffect(() => {
    if (countdown > 0) {
      const t = setTimeout(() => setCountdown(c => c - 1), 1000);
      return () => clearTimeout(t);
    }
  }, [countdown]);

  const normalizePhone = (raw: string) => raw.replace(/\s/g, '');

  const handleSendOtp = async () => {
    const normalized = normalizePhone(phone);
    if (!/^\+221[0-9]{9}$/.test(normalized)) return;

    try {
      await sendOtp.mutateAsync({ siteId, phone: normalized });
      setAuthStep('otp');
      setCountdown(120);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      alert(err.message ?? 'Erreur lors de l\'envoi du code');
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
    // Auto-submit si complet
    if (newOtp.every(d => d !== '') && value) {
      handleVerifyOtp(newOtp.join(''));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOtp = async (code?: string) => {
    const fullCode = code ?? otp.join('');
    if (fullCode.length !== 6) return;

    try {
      const result = await verifyOtp.mutateAsync({
        siteId,
        phone: normalizePhone(phone),
        code: fullCode,
      });
      onSuccess({
        userId: result.userId,
        loyaltyPts: result.loyaltyPts,
        loyaltyLevel: result.loyaltyLevel,
        phone: normalizePhone(phone),
      });
    } catch (err: any) {
      setOtp(['', '', '', '', '', '']);
      otpRefs.current[0]?.focus();
      alert(err.message ?? 'Code incorrect');
    }
  };

  return (
    <div className="flex flex-col gap-5 pt-4 pc-animate-slide-up">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-3 flex items-center justify-center"
          style={{ background: `${primaryColor}18` }}
        >
          <Phone size={32} style={{ color: primaryColor }} />
        </div>
        <h2 className="text-xl font-black" style={{ color: 'var(--pc-text)' }}>
          {authStep === 'phone' ? 'Votre numéro' : 'Code de vérification'}
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--pc-muted)' }}>
          {authStep === 'phone'
            ? 'Entrez votre numéro de téléphone pour recevoir un code'
            : `Code envoyé au ${phone}`}
        </p>
      </div>

      {authStep === 'phone' ? (
        <div className="flex flex-col gap-4">
          <div>
            <label className="block text-sm font-semibold mb-2" style={{ color: 'var(--pc-text)' }}>
              Numéro de téléphone
            </label>
            <input
              type="tel"
              className="pc-input"
              value={phone}
              onChange={e => {
                const val = e.target.value;
                if (!val.startsWith('+221 ')) {
                  setPhone('+221 ');
                } else {
                  setPhone(val);
                }
              }}
              placeholder="+221 77 XXX XX XX"
              autoFocus
              inputMode="tel"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--pc-muted)' }}>
              Format : +221 77 000 00 00
            </p>
          </div>

          <button
            className="pc-btn-primary"
            onClick={handleSendOtp}
            disabled={sendOtp.isPending || normalizePhone(phone).length < 13}
          >
            {sendOtp.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full pc-animate-spin" />
                Envoi en cours...
              </span>
            ) : 'Recevoir le code →'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {/* Saisie OTP */}
          <div className="flex gap-2 justify-center">
            {otp.map((digit, i) => (
              <input
                key={i}
                ref={el => { otpRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={e => handleOtpChange(i, e.target.value)}
                onKeyDown={e => handleOtpKeyDown(i, e)}
                className="w-11 h-14 text-center text-xl font-black rounded-xl border-2 transition-all outline-none"
                style={{
                  borderColor: digit ? primaryColor : 'var(--pc-border)',
                  color: 'var(--pc-text)',
                  boxShadow: digit ? `0 0 0 3px ${primaryColor}20` : 'none',
                }}
              />
            ))}
          </div>

          <button
            className="pc-btn-primary"
            onClick={() => handleVerifyOtp()}
            disabled={verifyOtp.isPending || otp.some(d => !d)}
          >
            {verifyOtp.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full pc-animate-spin" />
                Vérification...
              </span>
            ) : 'Confirmer →'}
          </button>

          <div className="flex items-center justify-between">
            <button
              className="flex items-center gap-1 text-sm font-medium"
              style={{ color: 'var(--pc-muted)' }}
              onClick={() => { setAuthStep('phone'); setOtp(['','','','','','']); }}
            >
              <ArrowLeft size={16} /> Modifier
            </button>

            {countdown > 0 ? (
              <p className="text-sm" style={{ color: 'var(--pc-muted)' }}>
                Renvoi dans {countdown}s
              </p>
            ) : (
              <button
                className="flex items-center gap-1 text-sm font-semibold"
                style={{ color: primaryColor }}
                onClick={handleSendOtp}
                disabled={sendOtp.isPending}
              >
                <RefreshCw size={14} /> Renvoyer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

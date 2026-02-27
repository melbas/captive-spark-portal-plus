import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Phone, Mail, Ticket } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  siteId: string;
  onAuthenticated: (userId: string) => void;
  onBack: () => void;
}

export default function PortalAuth({ siteId, onAuthenticated, onBack }: Props) {
  const { t } = useLanguage();
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('phone');

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      const body = activeTab === 'phone'
        ? { phone: `+221${phone}`, siteId }
        : { email, siteId };

      const { data, error } = await supabase.functions.invoke('send-otp', { body });
      if (error) throw error;
      setOtpSent(true);
      toast.success(t('verificationCodeSent'));
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      const body = activeTab === 'phone'
        ? { phone: `+221${phone}`, code: otp, siteId }
        : { email, code: otp, siteId };

      const { data, error } = await supabase.functions.invoke('verify-otp', { body });
      if (error) throw error;
      toast.success(t('verificationSuccessful'));
      onAuthenticated(data.userId);
    } catch (err: any) {
      toast.error(err.message || t('invalidCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVoucher = async () => {
    setLoading(true);
    try {
      // Voucher verification directly via Supabase
      const { data: voucher, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('code', voucherCode.toUpperCase())
        .eq('site_id', siteId)
        .eq('is_used', false)
        .single();

      if (error || !voucher) {
        toast.error('Code invalide ou déjà utilisé');
        return;
      }
      toast.success('Code valide !');
      onAuthenticated(voucher.id); // Temporary: use voucher ID as user ref
    } catch (err: any) {
      toast.error(err.message || t('error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md rounded-2xl shadow-[var(--shadow-card)] animate-fade-in">
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onBack} className="rounded-xl">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <CardTitle className="text-xl font-bold">{t('chooseVerification')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setOtpSent(false); setOtp(''); }}>
          <TabsList className="grid w-full grid-cols-3 rounded-xl mb-4">
            <TabsTrigger value="phone" className="rounded-xl"><Phone className="h-4 w-4 mr-1" /> {t('phoneNumber')}</TabsTrigger>
            <TabsTrigger value="email" className="rounded-xl"><Mail className="h-4 w-4 mr-1" /> Email</TabsTrigger>
            <TabsTrigger value="voucher" className="rounded-xl"><Ticket className="h-4 w-4 mr-1" /> Voucher</TabsTrigger>
          </TabsList>

          <TabsContent value="phone">
            {!otpSent ? (
              <div className="space-y-4">
                <div className="flex gap-2">
                  <div className="flex items-center px-3 bg-muted rounded-xl text-sm font-medium">+221</div>
                  <Input
                    type="tel"
                    placeholder="77 123 45 67"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 9))}
                    className="rounded-xl"
                    maxLength={9}
                  />
                </div>
                <Button onClick={handleSendOtp} disabled={phone.length < 9 || loading} className="w-full rounded-xl h-11 font-semibold text-white" style={{ background: 'var(--brand-gradient)' }}>
                  {loading ? t('processing') : t('sendCode')}
                </Button>
              </div>
            ) : (
              <OtpInput otp={otp} setOtp={setOtp} loading={loading} onVerify={handleVerifyOtp} t={t} />
            )}
          </TabsContent>

          <TabsContent value="email">
            {!otpSent ? (
              <div className="space-y-4">
                <Input
                  type="email"
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-xl"
                />
                <Button onClick={handleSendOtp} disabled={!email.includes('@') || loading} className="w-full rounded-xl h-11 font-semibold text-white" style={{ background: 'var(--brand-gradient)' }}>
                  {loading ? t('processing') : t('sendCode')}
                </Button>
              </div>
            ) : (
              <OtpInput otp={otp} setOtp={setOtp} loading={loading} onVerify={handleVerifyOtp} t={t} />
            )}
          </TabsContent>

          <TabsContent value="voucher">
            <div className="space-y-4">
              <Input
                placeholder="CODE1234"
                value={voucherCode}
                onChange={(e) => setVoucherCode(e.target.value.toUpperCase().slice(0, 8))}
                className="rounded-xl text-center text-lg tracking-widest font-mono"
                maxLength={8}
              />
              <Button onClick={handleVoucher} disabled={voucherCode.length < 8 || loading} className="w-full rounded-xl h-11 font-semibold text-white" style={{ background: 'var(--brand-gradient)' }}>
                {loading ? t('processing') : t('verify')}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function OtpInput({ otp, setOtp, loading, onVerify, t }: { otp: string; setOtp: (v: string) => void; loading: boolean; onVerify: () => void; t: (k: string) => string }) {
  return (
    <div className="space-y-4">
      <Input
        type="text"
        inputMode="numeric"
        placeholder="• • • • • •"
        value={otp}
        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
        className="rounded-xl text-center text-2xl tracking-[0.5em] font-mono"
        maxLength={6}
      />
      <Button onClick={onVerify} disabled={otp.length < 4 || loading} className="w-full rounded-xl h-11 font-semibold text-white" style={{ background: 'var(--brand-gradient)' }}>
        {loading ? t('processing') : t('verify')}
      </Button>
    </div>
  );
}

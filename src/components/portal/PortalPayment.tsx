import React, { useState } from 'react';
import type { WifiPlan } from '@/types/premiumconnect';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { useLanguage } from '@/components/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  plan: WifiPlan;
  siteId: string;
  userId: string;
  mac: string;
  onSuccess: () => void;
  onBack: () => void;
}

export default function PortalPayment({ plan, siteId, userId, mac, onSuccess, onBack }: Props) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [method, setMethod] = useState<'wave' | 'orange_money' | null>(null);

  const handlePay = async () => {
    if (!method) { toast.error('Choisissez un mode de paiement'); return; }
    setLoading(true);

    try {
      if (method === 'wave') {
        const { data, error } = await supabase.functions.invoke('create-wave-payment', {
          body: { planId: plan.id, siteId, userId, mac },
        });
        if (error) throw error;
        // Redirect to Wave checkout
        if (data?.checkoutUrl) {
          window.location.href = data.checkoutUrl;
          return;
        }
      }

      if (method === 'orange_money') {
        const { data, error } = await supabase.functions.invoke('create-om-payment', {
          body: { planId: plan.id, siteId, userId, mac, phone: '' },
        });
        if (error) throw error;
        if (data?.paymentUrl) {
          window.location.href = data.paymentUrl;
          return;
        }
      }

      // Fallback for demo/dev: simulate success
      onSuccess();
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
          <CardTitle className="text-xl font-bold">{t('paymentMethod')}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="p-6 pt-2 space-y-6">
        {/* Plan summary */}
        <div className="rounded-xl bg-muted p-4">
          <div className="flex justify-between items-center">
            <div>
              <p className="font-semibold text-foreground">{plan.name}</p>
              <p className="text-sm text-muted-foreground">
                {plan.speedDownMb}/{plan.speedUpMb} Mbps · {plan.maxDevices} appareil(s)
              </p>
            </div>
            <p className="text-2xl font-extrabold text-brand-primary">
              {plan.priceFcfa.toLocaleString('fr-FR')} <span className="text-xs font-normal">FCFA</span>
            </p>
          </div>
        </div>

        {/* Payment methods */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMethod('wave')}
            className={`rounded-xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] ${
              method === 'wave' ? 'border-brand-primary bg-brand-primary/5' : 'border-border'
            }`}
          >
            <div className="text-2xl mb-1">🌊</div>
            <p className="font-semibold text-sm">Wave</p>
          </button>
          <button
            onClick={() => setMethod('orange_money')}
            className={`rounded-xl border-2 p-4 text-center transition-all duration-200 hover:scale-[1.02] ${
              method === 'orange_money' ? 'border-brand-primary bg-brand-primary/5' : 'border-border'
            }`}
          >
            <div className="text-2xl mb-1">🟠</div>
            <p className="font-semibold text-sm">Orange Money</p>
          </button>
        </div>

        <Button
          onClick={handlePay}
          disabled={!method || loading}
          className="w-full h-12 rounded-xl text-base font-semibold text-white"
          style={{ background: 'var(--brand-gradient)' }}
        >
          <CreditCard className="h-5 w-5 mr-2" />
          {loading ? t('processing') : `${t('pay')} ${plan.priceFcfa.toLocaleString('fr-FR')} FCFA`}
        </Button>
      </CardContent>
    </Card>
  );
}

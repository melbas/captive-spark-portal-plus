
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { CheckCircle, ArrowRight, Mail, Phone, AlertCircle, Loader2 } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";
import CountryCodeSelector, { countryCodes } from "@/components/CountryCodeSelector";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";

/**
 * P0 sécurité (AUDIT-BACKEND) : l'OTP est généré, stocké et vérifié UNIQUEMENT
 * côté serveur via les Edge Functions `send-otp` / `verify-otp`.
 * Aucun code n'est généré, stocké ni comparé dans le navigateur (fail-closed).
 * La vérification passe par `verify-otp` via user-service.createUser, appelé
 * par le parent (Index.handleAuth) avec le code saisi.
 *
 * siteId : requis par send-otp/verify-otp (rate limiting + stockage OTP
 * scoped au site). Le portail démo n'a pas encore de contexte site branché
 * (Index.tsx ne reçoit pas de siteId) — identifiant de démo explicite en
 * attendant l'intégration Portal.tsx → AuthBox (suivi: contexte site portail).
 */
const DEMO_SITE_ID = 'demo-site';

interface AuthBoxProps {
  onAuth: (method: 'sms' | 'email', data: AuthData) => void | Promise<void>;
}

interface AuthData {
  phoneNumber?: string;
  email?: string;
  code: string;
}


const AuthBox: React.FC<AuthBoxProps> = ({ onAuth }) => {
  const { t, language } = useLanguage();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [countryCode, setCountryCode] = useState("+221"); // Senegal as default
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [authMethod, setAuthMethod] = useState<'sms' | 'email'>('sms');
  const [phoneError, setPhoneError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown <= 0) return;
    const timer = setTimeout(() => setResendCountdown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCountdown]);

  // Get the current country example based on selected code
  const getCurrentCountryExample = () => {
    const country = countryCodes.find(c => c.code === countryCode);
    return country ? country.example : t("localFormat");
  };




  // Basic validation functions
  const isValidPhoneNumber = (phone: string): boolean => {
    // Simple validation - phone should be numbers only and at least 6 digits
    // Remove spaces and other non-digit characters for validation
    const digitsOnly = phone.replace(/\D/g, '');
    return digitsOnly.length >= 6 && digitsOnly.length <= 15;
  };

  const isValidEmail = (email: string): boolean => {
    // Basic email validation
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Envoi du code : Edge Function `send-otp` (génération + stockage serveur,
  // rate limiting 3/h/identifiant + 10/j/IP). Le front ne manipule jamais le code.
  const handleSendOtp = async (method: 'sms' | 'email') => {
    setIsSendingCode(true);
    setAuthError('');

    try {
      let payload: { phone?: string; email?: string; siteId: string };

      if (method === 'sms') {
        if (!phoneNumber) {
          setPhoneError(t('fillRequired'));
          return;
        }
        if (!isValidPhoneNumber(phoneNumber)) {
          setPhoneError(t('enterValidCode'));
          return;
        }
        payload = { phone: `${countryCode}${phoneNumber.replace(/\s/g, '')}`, siteId: DEMO_SITE_ID };
      } else {
        if (!email) {
          setEmailError(t('fillRequired'));
          return;
        }
        if (!isValidEmail(email)) {
          setEmailError(t('enterValidCode'));
          return;
        }
        payload = { email: email.trim(), siteId: DEMO_SITE_ID };
      }

      const { data, error } = await supabase.functions.invoke('send-otp', { body: payload });

      // Fail-closed : toute erreur (réseau, 429 rate limit, 5xx) bloque le
      // passage à l'écran de saisie OTP. Aucun fallback côté client.
      if (error || !data?.success) {
        console.error("send-otp a échoué:", error || data);
        toast.error(t("errorSendingCode"));
        setAuthError(t("errorSendingCode"));
        return;
      }

      toast.success(method === 'sms'
        ? `${t("verificationCodeSent")} ${t("toPhone")}`
        : `${t("verificationCodeSent")} ${t("toEmail")}`);
      setAuthMethod(method);
      setOtp('');
      setIsVerifying(true);
      setResendCountdown(60); // 60 seconds
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error(t("errorSendingCode"));
      setAuthError(t("errorSendingCode"));
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleResendCode = () => {
    if ((resendCountdown > 0)) return;
    handleSendOtp(authMethod);
  };

  // Vérification : AUCUNE comparaison locale. Le code saisi est transmis au
  // parent (Index.handleAuth → wifiPortalService.createUser) qui appelle la
  // Edge Function `verify-otp` : seule la réponse serveur décide du succès.
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 6) {
      toast.error(t("enterValidCode"));
      return;
    }

    setIsVerifyingCode(true);
    setAuthError('');

    try {
      const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
      await onAuth(authMethod, authMethod === 'sms'
        ? { phoneNumber: fullPhoneNumber, code: otp }
        : { email: email.trim(), code: otp });
      toast.success(t("verificationSuccessful"));
    } catch (error) {
      // verify-otp (côté serveur) a rejeté le code / l'identifiant.
      console.error("verify-otp a refusé le code:", error);
      toast.error(t("invalidCode"));
      setAuthError(t("invalidCode"));
    } finally {
      setIsVerifyingCode(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto glass-card animate-fade-in">
      {!isVerifying ? (
        <Tabs defaultValue="sms" className="w-full">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t("connectToWifi")}</CardTitle>
            <CardDescription className="text-center">
              {t("chooseVerification")}
            </CardDescription>
            <TabsList className="grid w-full grid-cols-2 mt-4">
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Phone className="h-4 w-4" /> SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" /> Email
              </TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent>
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <TabsContent value="sms" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <div className="flex space-x-2">
                    <CountryCodeSelector
                      value={countryCode}
                      onChange={setCountryCode}
                    />
                    <div className="relative flex-1">
                      <Input
                        id="phone"
                        placeholder={getCurrentCountryExample()}
                        className={`pl-2 ${phoneError ? 'border-red-500' : ''}`}
                        value={phoneNumber}
                        onChange={(e) => { setPhoneNumber(e.target.value); setPhoneError(''); }}
                        disabled={isSendingCode}
                      />
                    </div>
                  </div>
                  {phoneError && (
                    <p className="text-xs text-red-500">{phoneError}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {t("example")}: {getCurrentCountryExample()}
                  </p>
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleSendOtp('sms')}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("sending")}</>
                  ) : (
                    <>{t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </TabsContent>
            <TabsContent value="email" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">{t("emailAddress")}</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      className={`pl-10 ${emailError ? 'border-red-500' : ''}`}
                      value={email}
                      onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                      disabled={isSendingCode}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                </div>
                <Button
                  className="w-full"
                  onClick={() => handleSendOtp('email')}
                  disabled={isSendingCode}
                >
                  {isSendingCode ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("sending")}</>
                  ) : (
                    <>{t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" /></>
                  )}
                </Button>
              </div>
            </TabsContent>
          </CardContent>
        </Tabs>
      ) : (
        <div className="animate-fade-in">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-center">{t("verificationCode")}</CardTitle>
            <CardDescription className="text-center">
              {authMethod === 'sms'
                ? `${t("enterCodeSentTo")} ${countryCode} ${phoneNumber}`
                : `${t("enterCodeSentTo")} ${email}`}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {authError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{authError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="otp">{t("verificationCode")}</Label>
              <div className="flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">
                  {t("useCodeForDemo")}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResendCode}
                  disabled={(resendCountdown > 0) || isSendingCode}
                >
                  {(resendCountdown > 0)
                    ? `${t("resendIn")} ${resendCountdown}s`
                    : t("resendCode")}
                </Button>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isVerifyingCode || !otp || otp.length < 6}
            >
              {isVerifyingCode ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> {t("verifying")}</>
              ) : (
                <>{t("verify")} <CheckCircle className="ml-2 h-4 w-4" /></>
              )}
            </Button>
          </CardContent>
          <CardFooter>
            <Button
              variant="link"
              className="w-full"
              onClick={() => {
                setIsVerifying(false);
                setAuthError('');
                setOtp('');
              }}
              disabled={isVerifyingCode}
            >
              {t("goBack")}
            </Button>
          </CardFooter>
        </div>
      )}
    </Card>
  );
};

export default AuthBox;

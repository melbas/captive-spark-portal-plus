
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { CheckCircle, ArrowRight, Mail, Phone, AlertCircle } from 'lucide-react';
import { useLanguage } from "@/components/LanguageContext";
import CountryCodeSelector, { countryCodes } from "@/components/CountryCodeSelector";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AuthBoxProps {
  onAuth: (method: string, data: any) => void;
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
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  
  // Get the current country example based on selected code
  const getCurrentCountryExample = () => {
    const country = countryCodes.find(c => c.code === countryCode);
    return country ? country.example : t("localFormat");
  };
  
  // Clear any error when the user types
  useEffect(() => {
    if (phoneNumber) setPhoneError('');
    setAuthError('');
  }, [phoneNumber]);
  
  useEffect(() => {
    if (email) setEmailError('');
    setAuthError('');
  }, [email]);
  
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
  
  const handleSendOtp = (method: 'sms' | 'email') => {
    // In a real implementation, this would call an API endpoint to send the OTP
    if (method === 'sms') {
      if (!phoneNumber) {
        setPhoneError(t('fillRequired'));
        return;
      }
      
      if (!isValidPhoneNumber(phoneNumber)) {
        setPhoneError(t('enterValidCode'));
        return;
      }
    }
    
    if (method === 'email') {
      if (!email) {
        setEmailError(t('fillRequired'));
        return;
      }
      
      if (!isValidEmail(email)) {
        setEmailError(t('enterValidCode'));
        return;
      }
    }
    
    setAuthMethod(method);
    toast.success(`${t("verificationCodeSent")} ${method === 'sms' ? t("toPhone") : t("toEmail")}`);
    setIsVerifying(true);
  };
  
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error(t("enterValidCode"));
      return;
    }
    
    setIsLoading(true);
    setAuthError('');
    
    try {
      // Simulate OTP verification - in production, this would verify against a backend
      if (otp === '1234') { // Demo code
        toast.success(t("verificationSuccessful"));
        await onAuth('otp', { 
          phoneNumber: authMethod === 'sms' ? `${countryCode}${phoneNumber.replace(/\s/g, '')}` : undefined, 
          email: authMethod === 'email' ? email : undefined, 
          otp 
        });
      } else {
        toast.error(t("invalidCode"));
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError(t("authError"));
      toast.error(t("authError"));
    } finally {
      setIsLoading(false);
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
                        onChange={(e) => setPhoneNumber(e.target.value)}
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
                >
                  {t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" />
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
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-500">{emailError}</p>
                  )}
                </div>
                <Button 
                  className="w-full" 
                  onClick={() => handleSendOtp('email')}
                >
                  {t("sendCode")} <ArrowRight className="ml-2 h-4 w-4" />
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
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <p className="text-xs text-center text-muted-foreground">
                {t("useCodeForDemo")} <span className="font-bold">1234</span>
              </p>
            </div>
            <Button 
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isLoading}
            >
              {isLoading ? t("verifying") : t("verify")}
              {!isLoading && <CheckCircle className="ml-2 h-4 w-4" />}
            </Button>
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="w-full" 
              onClick={() => {
                setIsVerifying(false);
                setAuthError('');
              }}
              disabled={isLoading}
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

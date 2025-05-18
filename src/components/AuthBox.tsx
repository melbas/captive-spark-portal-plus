
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
import { wifiPortalService } from "@/services/wifi-portal-service";

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
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [authError, setAuthError] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [resendDisabled, setResendDisabled] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);
  
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
  
  // Handle countdown for resend code
  useEffect(() => {
    if (resendCountdown <= 0) {
      setResendDisabled(false);
      return;
    }
    
    const timer = setTimeout(() => {
      setResendCountdown(resendCountdown - 1);
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [resendCountdown]);
  
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
  
  const handleSendOtp = async (method: 'sms' | 'email') => {
    if (method === 'sms') {
      setIsSendingCode(true);
      
      try {
        if (!phoneNumber) {
          setPhoneError(t('fillRequired'));
          return;
        }
        
        if (!isValidPhoneNumber(phoneNumber)) {
          setPhoneError(t('enterValidCode'));
          return;
        }
        
        // Format the full phone number
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
        
        // Send the verification code
        const result = await wifiPortalService.sendVerificationCode(fullPhoneNumber);
        
        if (result.success) {
          toast.success(`${t("verificationCodeSent")} ${t("toPhone")}`);
          // Store the code for debug purposes
          setVerificationCode(result.code);
          setAuthMethod(method);
          setIsVerifying(true);
          
          // Start the countdown for resend
          setResendDisabled(true);
          setResendCountdown(60); // 60 seconds
        } else {
          // Even if SMS fails in development, allow continuing
          console.warn("SMS sending failed, but continuing in demo mode");
          toast.info(`${t("demoMode")}: ${t("useCode")} 1234`);
          setVerificationCode('1234'); // Fallback code
          setAuthMethod(method);
          setIsVerifying(true);
        }
      } catch (error) {
        console.error("Error sending OTP:", error);
        toast.error(t("errorSendingCode"));
        setAuthError(t("errorSendingCode"));
      } finally {
        setIsSendingCode(false);
      }
    } else if (method === 'email') {
      setIsSendingCode(true);
      
      try {
        if (!email) {
          setEmailError(t('fillRequired'));
          return;
        }
        
        if (!isValidEmail(email)) {
          setEmailError(t('enterValidCode'));
          return;
        }
        
        // In a real implementation, this would send an email
        // For now, simulate email sending
        setTimeout(() => {
          toast.success(`${t("verificationCodeSent")} ${t("toEmail")}`);
          // For demo, use a fixed code
          setVerificationCode('1234');
          setAuthMethod(method);
          setIsVerifying(true);
          
          // Start the countdown for resend
          setResendDisabled(true);
          setResendCountdown(60); // 60 seconds
        }, 1000);
      } catch (error) {
        console.error("Error sending email:", error);
        toast.error(t("errorSendingCode"));
        setAuthError(t("errorSendingCode"));
      } finally {
        setIsSendingCode(false);
      }
    }
  };
  
  const handleResendCode = () => {
    if (resendDisabled) return;
    handleSendOtp(authMethod);
  };
  
  const handleVerifyOtp = async () => {
    if (!otp || otp.length < 4) {
      toast.error(t("enterValidCode"));
      return;
    }
    
    setIsVerifyingCode(true);
    setAuthError('');
    
    try {
      if (authMethod === 'sms') {
        // Format the full phone number
        const fullPhoneNumber = `${countryCode}${phoneNumber.replace(/\s/g, '')}`;
        
        // Verify the code - in development, accept demo code or the actual sent code
        if (otp === verificationCode || otp === '1234' || 
            wifiPortalService.verifyCode(fullPhoneNumber, otp)) {
          toast.success(t("verificationSuccessful"));
          await onAuth('sms', { 
            phoneNumber: fullPhoneNumber
          });
        } else {
          toast.error(t("invalidCode"));
          setAuthError(t("invalidCode"));
        }
      } else {
        // For email, in this demo we just check against the fixed code
        if (otp === verificationCode || otp === '1234') {
          toast.success(t("verificationSuccessful"));
          await onAuth('email', { 
            email: email
          });
        } else {
          toast.error(t("invalidCode"));
          setAuthError(t("invalidCode"));
        }
      }
    } catch (error) {
      console.error("Authentication error:", error);
      setAuthError(t("authError"));
      toast.error(t("authError"));
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
                        onChange={(e) => setPhoneNumber(e.target.value)}
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
                      onChange={(e) => setEmail(e.target.value)}
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
                <InputOTP maxLength={4} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-muted-foreground">
                  {t("useCodeForDemo")} <span className="font-bold">1234</span>
                </p>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleResendCode}
                  disabled={resendDisabled || isSendingCode}
                >
                  {resendDisabled 
                    ? `${t("resendIn")} ${resendCountdown}s` 
                    : t("resendCode")}
                </Button>
              </div>
            </div>
            <Button 
              className="w-full"
              onClick={handleVerifyOtp}
              disabled={isVerifyingCode || !otp || otp.length < 4}
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


import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from 'sonner';
import { CheckCircle, ArrowRight, Mail, Phone } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/components/LanguageContext";
import { 
  InputOTP,
  InputOTPGroup,
  InputOTPSlot
} from "@/components/ui/input-otp";

interface AuthBoxProps {
  onAuth: (method: string, data: any) => void;
}

// Country codes for West African countries
interface CountryCode {
  code: string;
  name: string;
  flag: string;
}

const countryCodes: CountryCode[] = [
  { code: "+221", name: "Senegal", flag: "🇸🇳" },
  { code: "+225", name: "Côte d'Ivoire", flag: "🇨🇮" },
  { code: "+223", name: "Mali", flag: "🇲🇱" },
  { code: "+224", name: "Guinea", flag: "🇬🇳" },
  { code: "+229", name: "Benin", flag: "🇧🇯" },
  { code: "+226", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+227", name: "Niger", flag: "🇳🇪" },
  { code: "+228", name: "Togo", flag: "🇹🇬" },
  { code: "+220", name: "Gambia", flag: "🇬🇲" },
  { code: "+245", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+234", name: "Nigeria", flag: "🇳🇬" },
  { code: "+233", name: "Ghana", flag: "🇬🇭" },
  { code: "+237", name: "Cameroon", flag: "🇨🇲" },
  { code: "+235", name: "Chad", flag: "🇹🇩" },
  { code: "+241", name: "Gabon", flag: "🇬🇦" },
  { code: "+240", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+236", name: "Central African Republic", flag: "🇨🇫" },
];

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
  
  // Clear any error when the user types
  useEffect(() => {
    if (phoneNumber) setPhoneError('');
  }, [phoneNumber]);
  
  useEffect(() => {
    if (email) setEmailError('');
  }, [email]);
  
  // Basic validation functions
  const isValidPhoneNumber = (phone: string): boolean => {
    // Simple validation - phone should be numbers only and at least 6 digits
    return /^[0-9]{6,}$/.test(phone.replace(/\s/g, ''));
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
  
  const handleVerifyOtp = () => {
    if (!otp || otp.length < 4) {
      toast.error(t("enterValidCode"));
      return;
    }
    
    // Simulate OTP verification - in production, this would verify against a backend
    if (otp === '1234') { // Demo code
      toast.success(t("verificationSuccessful"));
      onAuth('otp', { 
        phoneNumber: authMethod === 'sms' ? `${countryCode}${phoneNumber}` : undefined, 
        email: authMethod === 'email' ? email : undefined, 
        otp 
      });
    } else {
      toast.error(t("invalidCode"));
    }
  };

  const formatPhoneExample = () => {
    switch(countryCode) {
      case "+221": return "77 123 45 67"; // Senegal
      case "+225": return "07 12 34 56"; // Côte d'Ivoire
      case "+223": return "76 12 34 56"; // Mali
      case "+224": return "62 12 34 56"; // Guinea
      case "+229": return "97 12 34 56"; // Benin
      case "+226": return "70 12 34 56"; // Burkina Faso
      case "+227": return "90 12 34 56"; // Niger
      case "+228": return "90 12 34 56"; // Togo
      case "+220": return "7 123 45 67"; // Gambia
      case "+245": return "95 567 89 01"; // Guinea-Bissau
      case "+234": return "803 123 4567"; // Nigeria
      case "+233": return "24 123 4567"; // Ghana
      default: return t("localFormat");
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
            <TabsContent value="sms" className="animate-slide-in">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">{t("phoneNumber")}</Label>
                  <div className="flex space-x-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-[110px]">
                        <SelectValue placeholder={t("countryCode")} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px]">
                        {countryCodes.map((country) => (
                          <SelectItem key={country.code} value={country.code}>
                            <div className="flex items-center">
                              <span className="mr-2">{country.flag}</span>
                              <span>{country.code}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="relative flex-1">
                      <Input 
                        id="phone" 
                        placeholder={formatPhoneExample()} 
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
                    {t("example")}: {formatPhoneExample()}
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
            >
              {t("verify")} <CheckCircle className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
          <CardFooter>
            <Button 
              variant="link" 
              className="w-full" 
              onClick={() => setIsVerifying(false)}
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
